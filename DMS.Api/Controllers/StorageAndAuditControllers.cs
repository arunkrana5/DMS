using DMS.Api.Authorization;
using DMS.Api.Common;
using DMS.Api.Data;
using DMS.Api.DTOs;
using DMS.Api.Entities;
using DMS.Api.Services;
using DMS.Api.Storage.Factory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DMS.Api.Controllers;

[ApiController]
[Route("api/v1/folders")]
[Authorize]
public class FoldersController : ControllerBase
{
    private readonly IFolderService _folderService;

    public FoldersController(IFolderService folderService)
    {
        _folderService = folderService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateFolder([FromBody] CreateFolderRequest request, CancellationToken cancellationToken)
    {
        var result = await _folderService.CreateFolderAsync(request, cancellationToken);
        return Ok(ApiResponse<FolderDto>.Ok(result, "Folder created successfully."));
    }

    [HttpPut("{publicId}")]
    public async Task<IActionResult> UpdateFolder(string publicId, [FromBody] UpdateFolderRequest request, CancellationToken cancellationToken)
    {
        Guid g = Guid.Empty;
        if (!string.IsNullOrWhiteSpace(publicId)) Guid.TryParse(publicId, out g);
        var result = await _folderService.UpdateFolderAsync(g, request, cancellationToken);
        return Ok(ApiResponse<FolderDto>.Ok(result, "Folder updated successfully."));
    }

    [HttpGet]
    public async Task<IActionResult> GetFolders([FromQuery] int? parentFolderId, CancellationToken cancellationToken)
    {
        var result = await _folderService.GetFolderHierarchyAsync(parentFolderId, cancellationToken);
        return Ok(ApiResponse<List<FolderDto>>.Ok(result));
    }

    [HttpDelete("{publicId}")]
    public async Task<IActionResult> DeleteFolder(string publicId, CancellationToken cancellationToken)
    {
        Guid g = Guid.Empty;
        if (!string.IsNullOrWhiteSpace(publicId)) Guid.TryParse(publicId, out g);
        await _folderService.SoftDeleteFolderAsync(g, cancellationToken);
        return Ok(ApiResponse.Ok("Folder soft-deleted successfully."));
    }
}

[ApiController]
[Route("api/v1/storage/profiles")]
[Authorize]
public class StorageProfilesController : ControllerBase
{
    private readonly DmsDbContext _dbContext;
    private readonly ITenantContext _tenantContext;
    private readonly IStorageProviderFactory _storageFactory;

    public StorageProfilesController(DmsDbContext dbContext, ITenantContext tenantContext, IStorageProviderFactory storageFactory)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
        _storageFactory = storageFactory;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfiles(
        [FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var query = _dbContext.StorageProfiles.AsNoTracking();

        if (!isSuperAdmin)
        {
            query = query.Where(sp => sp.TenantId == tenantId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(sp => sp.Name.ToLower().Contains(s) || sp.ProviderCode.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(sp => sp.IsDefault)
            .ThenBy(sp => sp.Name)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(sp => new StorageProfileDto
            {
                Id = sp.Id,
                PublicId = sp.PublicId,
                TenantId = sp.TenantId,
                Name = sp.Name,
                ProviderCode = sp.ProviderCode,
                IsDefault = sp.IsDefault,
                IsActive = sp.IsActive,
                ConfigurationJson = sp.ConfigurationJsonEncrypted
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<PagedResult<StorageProfileDto>>.Ok(new PagedResult<StorageProfileDto>
        {
            Items = items,
            TotalCount = total,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        }));
    }

    [HttpPost]
    public async Task<IActionResult> CreateProfile([FromBody] CreateStorageProfileRequest request)
    {
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var tenantId = (request.TenantId.HasValue && request.TenantId > 0 && isSuperAdmin)
            ? request.TenantId.Value
            : _tenantContext.TenantId;

        if (request.IsDefault)
        {
            var existingDefaults = await _dbContext.StorageProfiles.Where(sp => sp.TenantId == tenantId && sp.IsDefault).ToListAsync();
            foreach (var p in existingDefaults) p.IsDefault = false;
        }

        var profile = new StorageProfile
        {
            TenantId = tenantId,
            Name = request.Name,
            ProviderCode = request.ProviderCode,
            IsDefault = request.IsDefault,
            IsActive = true,
            ConfigurationJsonEncrypted = request.ConfigurationJson ?? "{}",
            CreatedBy = _tenantContext.UserId > 0 ? _tenantContext.UserId : 1,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.StorageProfiles.Add(profile);
        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse<StorageProfileDto>.Ok(new StorageProfileDto
        {
            Id = profile.Id,
            PublicId = profile.PublicId,
            TenantId = profile.TenantId,
            Name = profile.Name,
            ProviderCode = profile.ProviderCode,
            IsDefault = profile.IsDefault,
            IsActive = profile.IsActive,
            ConfigurationJson = profile.ConfigurationJsonEncrypted
        }, "Storage Profile created successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateProfile(int id, [FromBody] CreateStorageProfileRequest request)
    {
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var profile = await _dbContext.StorageProfiles.FirstOrDefaultAsync(sp => sp.Id == id && (isSuperAdmin || sp.TenantId == _tenantContext.TenantId));
        if (profile == null) return NotFound(ApiResponse.Fail("DMS019", "Storage profile not found."));

        if (request.TenantId.HasValue && request.TenantId > 0 && isSuperAdmin)
        {
            profile.TenantId = request.TenantId.Value;
        }

        if (request.IsDefault && !profile.IsDefault)
        {
            var existingDefaults = await _dbContext.StorageProfiles.Where(sp => sp.TenantId == profile.TenantId && sp.IsDefault).ToListAsync();
            foreach (var p in existingDefaults) p.IsDefault = false;
        }

        profile.Name = request.Name;
        profile.ProviderCode = request.ProviderCode;
        profile.IsDefault = request.IsDefault;
        if (!string.IsNullOrWhiteSpace(request.ConfigurationJson))
        {
            profile.ConfigurationJsonEncrypted = request.ConfigurationJson;
        }
        profile.ModifiedBy = _tenantContext.UserId > 0 ? _tenantContext.UserId : 1;
        profile.ModifiedDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse<StorageProfileDto>.Ok(new StorageProfileDto
        {
            Id = profile.Id,
            PublicId = profile.PublicId,
            TenantId = profile.TenantId,
            Name = profile.Name,
            ProviderCode = profile.ProviderCode,
            IsDefault = profile.IsDefault,
            IsActive = profile.IsActive,
            ConfigurationJson = profile.ConfigurationJsonEncrypted
        }, "Storage Profile updated successfully."));
    }

    [HttpPost("{id:int}/test")]
    public async Task<IActionResult> TestProfileConnection(int id, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var profile = await _dbContext.StorageProfiles.FirstOrDefaultAsync(sp => sp.Id == id && (isSuperAdmin || sp.TenantId == tenantId), cancellationToken);
        if (profile == null) return NotFound(ApiResponse.Fail("DMS019", "Storage profile not found."));

        try
        {
            var provider = await _storageFactory.GetProviderAsync(profile, cancellationToken);
            var isConnected = await provider.TestConnectionAsync(cancellationToken);

            return Ok(ApiResponse<object>.Ok(new { IsConnected = isConnected.IsSuccess }, isConnected.IsSuccess ? "Connection successful." : "Connection failed."));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse.Fail("DMS020", $"Storage connection test failed: {ex.Message}"));
        }
    }

    [HttpPut("{id:int}/set-default")]
    public async Task<IActionResult> SetDefaultProfile(int id, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var profiles = await _dbContext.StorageProfiles.Where(sp => isSuperAdmin || sp.TenantId == tenantId).ToListAsync(cancellationToken);
        var target = profiles.FirstOrDefault(sp => sp.Id == id);
        if (target == null) return NotFound(ApiResponse.Fail("DMS019", "Storage profile not found."));

        foreach (var p in profiles)
        {
            p.IsDefault = (p.Id == id);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ApiResponse.Ok($"Storage Profile '{target.Name}' set as default for tenant."));
    }
}

[ApiController]
[Route("api/v1/storage/routing-rules")]
[Authorize]
public class StorageRoutingRulesController : ControllerBase
{
    private readonly DmsDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public StorageRoutingRulesController(DmsDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetRoutingRules(CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var rules = await _dbContext.StorageRoutingRules
            .Include(r => r.StorageProfile)
            .Include(r => r.Application)
            .Include(r => r.DocumentType)
            .AsNoTracking()
            .Where(r => isSuperAdmin || r.TenantId == tenantId)
            .OrderByDescending(r => r.Priority ?? 0)
            .Select(r => new StorageRoutingRuleDto
            {
                Id = r.Id,
                PublicId = r.PublicId,
                TenantId = r.TenantId,
                ApplicationId = r.ApplicationId,
                ApplicationCode = r.Application != null ? r.Application.ApplicationCode : null,
                ApplicationName = r.Application != null ? r.Application.ApplicationName : null,
                ModuleCode = r.ModuleCode,
                EntityType = r.EntityType,
                DocumentTypeId = r.DocumentTypeId,
                DocumentTypeName = r.DocumentType != null ? r.DocumentType.Name : null,
                StorageProfileId = r.StorageProfileId,
                StorageProfileName = r.StorageProfile != null ? r.StorageProfile.Name : "Storage",
                Priority = r.Priority ?? 10,
                IsActive = r.IsActive
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<List<StorageRoutingRuleDto>>.Ok(rules));
    }

    [HttpPost]
    public async Task<IActionResult> CreateRoutingRule([FromBody] CreateStorageRoutingRuleRequest request)
    {
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var tenantId = (request.TenantId.HasValue && request.TenantId > 0 && isSuperAdmin)
            ? request.TenantId.Value
            : _tenantContext.TenantId;

        var rule = new StorageRoutingRule
        {
            TenantId = tenantId,
            ApplicationId = request.ApplicationId,
            ModuleCode = request.ModuleCode,
            EntityType = request.EntityType,
            DocumentTypeId = request.DocumentTypeId,
            StorageProfileId = request.StorageProfileId,
            Priority = request.Priority ?? 10,
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.StorageRoutingRules.Add(rule);
        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Storage routing rule created successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteRoutingRule(int id)
    {
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var rule = await _dbContext.StorageRoutingRules.FirstOrDefaultAsync(r => r.Id == id && (isSuperAdmin || r.TenantId == _tenantContext.TenantId));
        if (rule == null) return NotFound(ApiResponse.Fail("DMS021", "Routing rule not found."));

        _dbContext.StorageRoutingRules.Remove(rule);
        await _dbContext.SaveChangesAsync();

        return Ok(ApiResponse.Ok("Routing rule deleted successfully."));
    }
}

[ApiController]
[Route("api/v1/audit")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly DmsDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public AuditLogsController(DmsDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? action = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var query = _dbContext.AuditLogs.IgnoreQueryFilters().AsNoTracking();

        if (!isSuperAdmin)
        {
            query = query.Where(a => a.TenantId == tenantId);
        }

        if (!string.IsNullOrWhiteSpace(action) && action != "ALL")
        {
            query = query.Where(a => a.Action.ToUpper() == action.Trim().ToUpper());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(a => (a.Remarks != null && a.Remarks.ToLower().Contains(s)) || a.Action.ToLower().Contains(s) || (a.IPAddress != null && a.IPAddress.Contains(s)));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Include(a => a.Document)
            .OrderByDescending(a => a.CreatedDate)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto
            {
                Id = a.Id,
                TenantId = a.TenantId,
                Action = a.Action,
                UserId = a.UserId,
                DocumentId = a.DocumentId,
                DocumentPublicId = a.Document != null ? a.Document.PublicId : (Guid?)null,
                DocumentName = a.Document != null ? a.Document.FileName : null,
                IPAddress = a.IPAddress,
                ProviderCode = a.StorageProvider,
                Details = a.Remarks,
                CreatedDate = a.CreatedDate
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<PagedResult<AuditLogDto>>.Ok(new PagedResult<AuditLogDto>
        {
            Items = items,
            TotalCount = total,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        }));
    }
}
