using DMS.Api.Authorization;
using DMS.Api.Common;
using DMS.Api.Data;
using DMS.Api.DTOs;
using DMS.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DMS.Api.Controllers;

[ApiController]
[Route("api/v1/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly DmsDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public DashboardController(DmsDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var today = DateTime.UtcNow.Date;

        var totalDocs = await _dbContext.Documents.CountAsync(d => isSuperAdmin || d.TenantId == tenantId);
        var totalBytes = await _dbContext.Documents.Where(d => isSuperAdmin || d.TenantId == tenantId).SumAsync(d => (long?)d.FileSize) ?? 0;
        var totalApps = await _dbContext.Applications.CountAsync(a => isSuperAdmin || a.TenantId == tenantId);
        var activeUsers = await _dbContext.Users.CountAsync(u => (isSuperAdmin || u.TenantId == tenantId) && u.IsActive);
        var uploadsToday = await _dbContext.Documents.CountAsync(d => (isSuperAdmin || d.TenantId == tenantId) && d.CreatedDate >= today);
        var downloadsToday = await _dbContext.AuditLogs.CountAsync(a => (isSuperAdmin || a.TenantId == tenantId) && a.Action == "DOWNLOAD" && a.CreatedDate >= today);
        var failedOps = await _dbContext.StorageMigrationJobs.CountAsync(j => (isSuperAdmin || j.TenantId == tenantId) && j.Status == "Failed");

        return Ok(ApiResponse<DashboardStatsDto>.Ok(new DashboardStatsDto
        {
            TotalDocuments = totalDocs,
            TotalStorageBytes = totalBytes,
            TotalApplications = totalApps,
            ActiveUsers = activeUsers,
            UploadsToday = uploadsToday,
            DownloadsToday = downloadsToday,
            FailedOperations = failedOps,
            StorageHealth = "Healthy"
        }));
    }
}

[ApiController]
[Route("api/v1/applications")]
[Authorize]
public class ApplicationsController : ControllerBase
{
    private readonly DmsDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public ApplicationsController(DmsDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetApplications(
        [FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var query = _dbContext.Applications.AsNoTracking();

        if (!isSuperAdmin)
        {
            query = query.Where(a => a.TenantId == tenantId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(a => a.ApplicationName.ToLower().Contains(s) || a.ApplicationCode.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(a => a.ApplicationName)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new ApplicationDto
            {
                Id = a.Id,
                TenantId = a.TenantId,
                ApplicationCode = a.ApplicationCode,
                ApplicationName = a.ApplicationName,
                Description = a.Description,
                IsActive = a.IsActive,
                CreatedDate = a.CreatedDate
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<PagedResult<ApplicationDto>>.Ok(new PagedResult<ApplicationDto>
        {
            Items = items,
            TotalCount = total,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        }));
    }

    [HttpPost]
    public async Task<IActionResult> CreateApplication([FromBody] CreateApplicationRequest request)
    {
        var currentTenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        int targetTenantId = (isSuperAdmin && request.TenantId.HasValue && request.TenantId.Value > 0)
            ? request.TenantId.Value
            : currentTenantId;

        // Auto-match tenant if ApplicationCode matches a TenantCode (e.g. BLUESTAR)
        if (targetTenantId == currentTenantId && isSuperAdmin && !string.IsNullOrWhiteSpace(request.ApplicationCode))
        {
            var code = request.ApplicationCode.Trim().ToUpper();
            var matchedTenant = await _dbContext.Tenants.FirstOrDefaultAsync(t => t.TenantCode == code || code.Contains(t.TenantCode));
            if (matchedTenant != null)
            {
                targetTenantId = matchedTenant.Id;
            }
        }

        var app = new Application
        {
            TenantId = targetTenantId,
            ApplicationCode = request.ApplicationCode.Trim().ToUpper(),
            ApplicationName = request.ApplicationName.Trim(),
            Description = request.Description,
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.Applications.Add(app);
        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse<ApplicationDto>.Ok(new ApplicationDto
        {
            Id = app.Id,
            TenantId = app.TenantId,
            ApplicationCode = app.ApplicationCode,
            ApplicationName = app.ApplicationName,
            Description = app.Description,
            IsActive = app.IsActive,
            CreatedDate = app.CreatedDate
        }, "Application registered successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateApplication(int id, [FromBody] CreateApplicationRequest request)
    {
        var app = await _dbContext.Applications.FirstOrDefaultAsync(a => a.Id == id);
        if (app == null) return NotFound(ApiResponse.Fail("DMS004", "Application not found."));

        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        if (!isSuperAdmin && app.TenantId != _tenantContext.TenantId)
        {
            return Forbid();
        }

        if (isSuperAdmin && request.TenantId.HasValue && request.TenantId.Value > 0)
        {
            app.TenantId = request.TenantId.Value;
        }

        app.ApplicationName = request.ApplicationName.Trim();
        app.ApplicationCode = request.ApplicationCode.Trim().ToUpper();
        app.Description = request.Description;
        app.ModifiedDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse<ApplicationDto>.Ok(new ApplicationDto
        {
            Id = app.Id,
            TenantId = app.TenantId,
            ApplicationCode = app.ApplicationCode,
            ApplicationName = app.ApplicationName,
            Description = app.Description,
            IsActive = app.IsActive,
            CreatedDate = app.CreatedDate
        }, "Application updated successfully."));
    }
}

[ApiController]
[Route("api/v1/document-types")]
[Authorize]
public class DocumentTypesController : ControllerBase
{
    private readonly DmsDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public DocumentTypesController(DmsDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetDocumentTypes(
        [FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var query = _dbContext.DocumentTypes.AsNoTracking();

        if (!isSuperAdmin)
        {
            query = query.Where(dt => dt.TenantId == tenantId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(dt => dt.Name.ToLower().Contains(s) || dt.Code.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(dt => dt.Name)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(dt => new DocumentTypeDto
            {
                Id = dt.Id,
                TenantId = dt.TenantId,
                TypeCode = dt.Code,
                TypeName = dt.Name,
                Description = dt.Description,
                ModuleCode = dt.ModuleCode,
                AllowedExtensions = dt.AllowedExtensions,
                MaxFileSizeBytes = dt.MaxFileSize,
                IsMandatory = dt.IsMandatory,
                IsActive = dt.IsActive
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<PagedResult<DocumentTypeDto>>.Ok(new PagedResult<DocumentTypeDto>
        {
            Items = items,
            TotalCount = total,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        }));
    }

    [HttpPost]
    public async Task<IActionResult> CreateDocumentType([FromBody] CreateDocumentTypeRequest request)
    {
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var tenantId = (isSuperAdmin && request.TenantId.HasValue && request.TenantId.Value > 0) ? request.TenantId.Value : _tenantContext.TenantId;

        var docType = new DocumentType
        {
            TenantId = tenantId,
            Code = request.TypeCode,
            Name = request.TypeName,
            Description = request.Description,
            ModuleCode = request.ModuleCode,
            AllowedExtensions = request.AllowedExtensions ?? ".pdf,.docx,.jpg,.png",
            MaxFileSize = request.MaxFileSizeBytes ?? 104857600,
            IsMandatory = request.IsMandatory,
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.DocumentTypes.Add(docType);
        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse<DocumentTypeDto>.Ok(new DocumentTypeDto
        {
            Id = docType.Id,
            TenantId = docType.TenantId,
            TypeCode = docType.Code,
            TypeName = docType.Name,
            Description = docType.Description,
            ModuleCode = docType.ModuleCode,
            AllowedExtensions = docType.AllowedExtensions,
            MaxFileSizeBytes = docType.MaxFileSize,
            IsMandatory = docType.IsMandatory,
            IsActive = docType.IsActive
        }, "Document Type registered successfully."));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDocumentType(int id, [FromBody] UpdateDocumentTypeRequest request)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var docType = await _dbContext.DocumentTypes.FirstOrDefaultAsync(dt => dt.Id == id && (isSuperAdmin || dt.TenantId == tenantId));
        if (docType == null)
        {
            return NotFound(ApiResponse.Fail("DMS033", "Document Type not found."));
        }

        docType.Name = request.TypeName.Trim();
        docType.Description = request.Description;
        docType.ModuleCode = request.ModuleCode;
        if (!string.IsNullOrWhiteSpace(request.AllowedExtensions))
        {
            docType.AllowedExtensions = request.AllowedExtensions;
        }
        if (request.MaxFileSizeBytes.HasValue && request.MaxFileSizeBytes.Value > 0)
        {
            docType.MaxFileSize = request.MaxFileSizeBytes.Value;
        }
        docType.IsMandatory = request.IsMandatory;
        docType.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse<DocumentTypeDto>.Ok(new DocumentTypeDto
        {
            Id = docType.Id,
            TenantId = docType.TenantId,
            TypeCode = docType.Code,
            TypeName = docType.Name,
            Description = docType.Description,
            ModuleCode = docType.ModuleCode,
            AllowedExtensions = docType.AllowedExtensions,
            MaxFileSizeBytes = docType.MaxFileSize,
            IsMandatory = docType.IsMandatory,
            IsActive = docType.IsActive
        }, "Document Type updated successfully."));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDocumentType(int id)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var docType = await _dbContext.DocumentTypes.FirstOrDefaultAsync(dt => dt.Id == id && (isSuperAdmin || dt.TenantId == tenantId));
        if (docType == null)
        {
            return NotFound(ApiResponse.Fail("DMS033", "Document Type not found."));
        }

        _dbContext.DocumentTypes.Remove(docType);
        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Document Type deleted successfully."));
    }
}

[ApiController]
[Route("api/v1/webhooks")]
[Authorize]
public class WebhooksController : ControllerBase
{
    private readonly DmsDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public WebhooksController(DmsDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetWebhooks(
        [FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var query = _dbContext.Webhooks.AsNoTracking();

        if (!isSuperAdmin)
        {
            query = query.Where(w => w.TenantId == tenantId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(w => w.EventType.ToLower().Contains(s) || w.Endpoint.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(w => w.CreatedDate)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(w => new WebhookDto
            {
                Id = w.Id,
                TenantId = w.TenantId,
                EventType = w.EventType,
                Endpoint = w.Endpoint,
                IsActive = w.IsActive,
                CreatedDate = w.CreatedDate
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<PagedResult<WebhookDto>>.Ok(new PagedResult<WebhookDto>
        {
            Items = items,
            TotalCount = total,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        }));
    }

    [HttpPost]
    public async Task<IActionResult> CreateWebhook([FromBody] CreateWebhookRequest request)
    {
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var tenantId = (isSuperAdmin && request.TenantId.HasValue && request.TenantId.Value > 0) ? request.TenantId.Value : _tenantContext.TenantId;

        var webhook = new Webhook
        {
            TenantId = tenantId,
            EventType = request.EventType,
            Endpoint = request.Endpoint,
            SecretReference = request.SecretKey ?? "dms_secret_key",
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.Webhooks.Add(webhook);
        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse<WebhookDto>.Ok(new WebhookDto
        {
            Id = webhook.Id,
            TenantId = webhook.TenantId,
            EventType = webhook.EventType,
            Endpoint = webhook.Endpoint,
            IsActive = webhook.IsActive,
            CreatedDate = webhook.CreatedDate
        }, "Webhook subscription registered."));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateWebhook(int id, [FromBody] UpdateWebhookRequest request)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var webhook = await _dbContext.Webhooks.FirstOrDefaultAsync(w => w.Id == id && (isSuperAdmin || w.TenantId == tenantId));
        if (webhook == null)
        {
            return NotFound(ApiResponse.Fail("DMS034", "Webhook subscription not found."));
        }

        webhook.EventType = request.EventType;
        webhook.Endpoint = request.Endpoint;
        if (!string.IsNullOrWhiteSpace(request.SecretKey))
        {
            webhook.SecretReference = request.SecretKey;
        }
        webhook.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse<WebhookDto>.Ok(new WebhookDto
        {
            Id = webhook.Id,
            TenantId = webhook.TenantId,
            EventType = webhook.EventType,
            Endpoint = webhook.Endpoint,
            IsActive = webhook.IsActive,
            CreatedDate = webhook.CreatedDate
        }, "Webhook subscription updated successfully."));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteWebhook(int id)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var webhook = await _dbContext.Webhooks.FirstOrDefaultAsync(w => w.Id == id && (isSuperAdmin || w.TenantId == tenantId));
        if (webhook == null)
        {
            return NotFound(ApiResponse.Fail("DMS034", "Webhook subscription not found."));
        }

        _dbContext.Webhooks.Remove(webhook);
        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Webhook subscription deleted successfully."));
    }
}

[ApiController]
[Route("api/v1/tenant-modules")]
[Authorize]
public class TenantModulesController : ControllerBase
{
    private readonly DmsDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public TenantModulesController(DmsDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetModules(
        [FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var query = _dbContext.TenantModules.AsNoTracking();
        if (!isSuperAdmin)
        {
            query = query.Where(m => m.TenantId == tenantId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(m => m.ModuleCode.ToLower().Contains(s) || m.ModuleName.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        var totalPages = (int)Math.Ceiling((double)total / pageSize);

        var modules = await query
            .OrderBy(m => m.DisplayOrder)
            .ThenBy(m => m.ModuleName)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new TenantModuleDto
            {
                Id = m.Id,
                TenantId = m.TenantId,
                ModuleCode = m.ModuleCode,
                ModuleName = m.ModuleName,
                Description = m.Description,
                DisplayOrder = m.DisplayOrder,
                IsActive = m.IsActive
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<PagedResult<TenantModuleDto>>.Ok(new PagedResult<TenantModuleDto>
        {
            Items = modules,
            TotalCount = total,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalPages = totalPages > 0 ? totalPages : 1
        }));
    }

    [HttpPost]
    public async Task<IActionResult> CreateModule([FromBody] CreateTenantModuleRequest request)
    {
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var tenantId = (isSuperAdmin && request.TenantId.HasValue && request.TenantId.Value > 0) ? request.TenantId.Value : _tenantContext.TenantId;
        var modCode = request.ModuleCode.Trim().ToUpper();

        var existing = await _dbContext.TenantModules.FirstOrDefaultAsync(m => m.TenantId == tenantId && m.ModuleCode == modCode);
        if (existing != null)
        {
            return BadRequest(ApiResponse.Fail("DMS031", $"Business module '{modCode}' already exists."));
        }

        var module = new TenantModule
        {
            TenantId = tenantId,
            ModuleCode = modCode,
            ModuleName = request.ModuleName.Trim(),
            Description = request.Description,
            DisplayOrder = request.DisplayOrder,
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.TenantModules.Add(module);
        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse<TenantModuleDto>.Ok(new TenantModuleDto
        {
            Id = module.Id,
            TenantId = module.TenantId,
            ModuleCode = module.ModuleCode,
            ModuleName = module.ModuleName,
            Description = module.Description,
            DisplayOrder = module.DisplayOrder,
            IsActive = module.IsActive
        }, "Module created successfully."));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateModule(int id, [FromBody] UpdateTenantModuleRequest request)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var module = await _dbContext.TenantModules.FirstOrDefaultAsync(m => m.Id == id && (isSuperAdmin || m.TenantId == tenantId));
        if (module == null)
        {
            return NotFound(ApiResponse.Fail("DMS032", "Module not found."));
        }

        module.ModuleName = request.ModuleName.Trim();
        module.Description = request.Description;
        module.DisplayOrder = request.DisplayOrder;
        module.IsActive = request.IsActive;
        module.ModifiedDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse<TenantModuleDto>.Ok(new TenantModuleDto
        {
            Id = module.Id,
            TenantId = module.TenantId,
            ModuleCode = module.ModuleCode,
            ModuleName = module.ModuleName,
            Description = module.Description,
            DisplayOrder = module.DisplayOrder,
            IsActive = module.IsActive
        }, "Module updated successfully."));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteModule(int id)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var module = await _dbContext.TenantModules.FirstOrDefaultAsync(m => m.Id == id && (isSuperAdmin || m.TenantId == tenantId));
        if (module == null)
        {
            return NotFound(ApiResponse.Fail("DMS032", "Module not found."));
        }

        _dbContext.TenantModules.Remove(module);
        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Module deleted successfully."));
    }
}

[ApiController]
[Route("api/v1/module-document-types")]
[Authorize]
public class ModuleDocumentTypesController : ControllerBase
{
    private readonly DmsDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public ModuleDocumentTypesController(DmsDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    [HttpGet("{moduleCode}")]
    public async Task<IActionResult> GetModuleDocTypes(string moduleCode, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId;
        var items = await _dbContext.ModuleDocumentTypes
            .AsNoTracking()
            .Include(mdt => mdt.DocumentType)
            .Where(mdt => mdt.TenantId == tenantId && mdt.ModuleCode.ToUpper() == moduleCode.ToUpper() && mdt.IsActive)
            .OrderBy(mdt => mdt.DisplayOrder)
            .Select(mdt => new ModuleDocumentTypeDto
            {
                Id = mdt.Id,
                TenantId = mdt.TenantId,
                ModuleCode = mdt.ModuleCode,
                DocumentTypeId = mdt.DocumentTypeId,
                DocumentTypeCode = mdt.DocumentType != null ? mdt.DocumentType.Code : "",
                DocumentTypeName = mdt.DocumentType != null ? mdt.DocumentType.Name : "",
                IsMandatory = mdt.IsMandatory,
                MaxAllowedFiles = mdt.MaxAllowedFiles,
                DisplayOrder = mdt.DisplayOrder
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<List<ModuleDocumentTypeDto>>.Ok(items));
    }

    [HttpPost]
    public async Task<IActionResult> ConfigureModuleDocType([FromBody] ConfigureModuleDocumentTypeRequest request)
    {
        var tenantId = _tenantContext.TenantId;
        var modCode = request.ModuleCode.Trim().ToUpper();

        var existing = await _dbContext.ModuleDocumentTypes
            .FirstOrDefaultAsync(mdt => mdt.TenantId == tenantId && mdt.ModuleCode == modCode && mdt.DocumentTypeId == request.DocumentTypeId);

        if (existing != null)
        {
            existing.IsMandatory = request.IsMandatory;
            existing.MaxAllowedFiles = request.MaxAllowedFiles;
            existing.DisplayOrder = request.DisplayOrder;
            existing.IsActive = true;
            existing.ModifiedDate = DateTime.UtcNow;
        }
        else
        {
            existing = new ModuleDocumentType
            {
                TenantId = tenantId,
                ModuleCode = modCode,
                DocumentTypeId = request.DocumentTypeId,
                IsMandatory = request.IsMandatory,
                MaxAllowedFiles = request.MaxAllowedFiles,
                DisplayOrder = request.DisplayOrder,
                IsActive = true,
                CreatedDate = DateTime.UtcNow
            };
            _dbContext.ModuleDocumentTypes.Add(existing);
        }

        await _dbContext.SaveChangesAsync();
        return Ok(ApiResponse.Ok(null, "Module document type rule configured successfully."));
    }
}
