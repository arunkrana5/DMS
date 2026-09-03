using DMS.Api.Authorization;
using DMS.Api.Common;
using DMS.Api.Data;
using DMS.Api.DTOs;
using DMS.Api.Entities;
using DMS.Api.Storage.Factory;
using Microsoft.EntityFrameworkCore;

namespace DMS.Api.Services;

public interface IDocumentService
{
    Task<DocumentDto> UploadDocumentAsync(UploadDocumentRequest request, Stream fileStream, string fileName, string contentType, long fileSize, string? idempotencyKey, CancellationToken cancellationToken = default);
    Task<List<DocumentDto>> UploadBatchDocumentsAsync(List<(UploadDocumentRequest Request, Stream Stream, string FileName, string ContentType, long FileSize)> items, CancellationToken cancellationToken = default);
    Task ValidateMandatoryDocumentTypesAsync(int tenantId, string? moduleCode, List<string> providedTypeCodes, CancellationToken cancellationToken = default);
    Task<BulkUploadResultDto> BulkRegisterAsync(List<BulkRegisterItemRequest> requests, CancellationToken cancellationToken = default);
    Task<DocumentVersionDto> CreateVersionAsync(Guid documentPublicId, Stream fileStream, string fileName, string contentType, long fileSize, string? remarks, CancellationToken cancellationToken = default);
    Task<DocumentDto> UpdateDocumentAsync(Guid publicId, UpdateDocumentRequest request, CancellationToken cancellationToken = default);
    Task<(Stream Stream, string ContentType, string FileName)> DownloadDocumentAsync(Guid documentPublicId, int? versionNumber = null, CancellationToken cancellationToken = default);
    Task<PagedResult<DocumentDto>> SearchDocumentsAsync(DocumentSearchRequest request, CancellationToken cancellationToken = default);
    Task<DocumentDto?> GetByPublicIdAsync(Guid publicId, CancellationToken cancellationToken = default);
    Task SoftDeleteDocumentAsync(Guid publicId, CancellationToken cancellationToken = default);
    Task RestoreDocumentAsync(Guid publicId, CancellationToken cancellationToken = default);
}

public class DocumentService : IDocumentService
{
    private readonly DmsDbContext _dbContext;
    private readonly ITenantContext _tenantContext;
    private readonly IStorageRoutingService _routingService;
    private readonly IStorageProviderFactory _storageFactory;
    private readonly IFilePolicyValidator _policyValidator;
    private readonly IIdempotencyService _idempotencyService;
    private readonly IConfigSettingsService _configService;
    private readonly IAuditLogger _auditLogger;
    private readonly IWebhookDispatcher _webhookDispatcher;
    private readonly IFirebaseNotificationService _firebaseService;

    public DocumentService(
        DmsDbContext dbContext,
        ITenantContext tenantContext,
        IStorageRoutingService routingService,
        IStorageProviderFactory storageFactory,
        IFilePolicyValidator policyValidator,
        IIdempotencyService idempotencyService,
        IConfigSettingsService configService,
        IAuditLogger auditLogger,
        IWebhookDispatcher webhookDispatcher,
        IFirebaseNotificationService firebaseService)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
        _routingService = routingService;
        _storageFactory = storageFactory;
        _policyValidator = policyValidator;
        _idempotencyService = idempotencyService;
        _configService = configService;
        _auditLogger = auditLogger;
        _webhookDispatcher = webhookDispatcher;
        _firebaseService = firebaseService;
    }

    public async Task<DocumentDto> UploadDocumentAsync(UploadDocumentRequest request, Stream fileStream, string fileName, string contentType, long fileSize, string? idempotencyKey, CancellationToken cancellationToken = default)
    {
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var tenantId = (isSuperAdmin && request.TenantId.HasValue && request.TenantId.Value > 0)
            ? request.TenantId.Value
            : _tenantContext.TenantId;

        var tenantCode = _tenantContext.TenantCode;
        if (isSuperAdmin && request.TenantId.HasValue && request.TenantId.Value > 0)
        {
            var targetTenant = await _dbContext.Tenants.FindAsync(new object[] { request.TenantId.Value }, cancellationToken);
            if (targetTenant != null) tenantCode = targetTenant.TenantCode;
        }

        // 1. Validate File Policy
        await _policyValidator.ValidateFileAsync(tenantId, fileName, fileSize, contentType, cancellationToken);

        // 2. Check Idempotency key if provided
        if (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            var reqHash = _idempotencyService.ComputeHash($"{tenantId}_{request.ApplicationId}_{request.ModuleCode}_{request.EntityType}_{request.EntityId}_{fileName}_{fileSize}");
            var existing = await _idempotencyService.CheckDuplicateAsync(tenantId, idempotencyKey, reqHash, cancellationToken);
            if (existing != null)
            {
                return MapToDto(existing);
            }
        }

        int? resolvedDocTypeId = request.DocumentTypeId;
        if (!resolvedDocTypeId.HasValue && !string.IsNullOrWhiteSpace(request.DocumentTypeCode))
        {
            var dt = await _dbContext.DocumentTypes.FirstOrDefaultAsync(d => (d.TenantId == tenantId || d.TenantId == 0) && d.Code == request.DocumentTypeCode.Trim(), cancellationToken);
            if (dt != null) resolvedDocTypeId = dt.Id;
        }

        // 3. Resolve Storage Profile via Routing Rules
        var profile = await _routingService.ResolveStorageProfileAsync(
            tenantId,
            request.ApplicationId ?? _tenantContext.ApplicationId,
            request.ModuleCode,
            request.EntityType,
            resolvedDocTypeId,
            cancellationToken);

        // 4. Resolve Storage Folder Path Key dynamically from Config Settings pattern template
        var folderKey = request.FolderKey;
        if (string.IsNullOrWhiteSpace(folderKey))
        {
            var pattern = await _configService.GetSettingAsync<string>(
                "Storage.FolderPathPattern",
                tenantId,
                request.ApplicationId ?? _tenantContext.ApplicationId,
                "{TenantCode}/{Year}/{Month}/{Day}/{ModuleCode}/{EntityType}/{EntityId}",
                cancellationToken);

            folderKey = BuildFolderPath(pattern ?? "{TenantCode}/{Year}/{Month}/{Day}/{ModuleCode}/{EntityType}/{EntityId}", tenantCode, tenantId, request.ModuleCode, request.EntityType, request.EntityId);
        }

        // 5. Resolve Storage Provider and Upload Stream
        var provider = await _storageFactory.GetProviderAsync(profile, cancellationToken);
        var uploadResult = await provider.UploadAsync(fileStream, fileName, contentType, folderKey, cancellationToken);

        // 6. Create Document & Version 1 metadata in database
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var doc = new Document
        {
            TenantId = tenantId,
            ApplicationId = request.ApplicationId ?? _tenantContext.ApplicationId,
            ModuleCode = request.ModuleCode,
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            FolderId = request.FolderId,
            StorageProfileId = profile.Id,
            StorageObjectKey = uploadResult.ObjectKey,
            FileName = fileName,
            OriginalFileName = fileName,
            Extension = ext,
            ContentType = contentType,
            FileSize = fileSize,
            DocumentTypeId = resolvedDocTypeId,
            Description = request.Description,
            CurrentVersion = 1,
            Status = "Active",
            UploadedBy = _tenantContext.UserId > 0 ? _tenantContext.UserId : 1,
            UploadedOn = DateTime.UtcNow,
            CreatedBy = _tenantContext.UserId > 0 ? _tenantContext.UserId : 1,
            CreatedDate = DateTime.UtcNow,
            IPAddress = _tenantContext.ClientIpAddress
        };

        _dbContext.Documents.Add(doc);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var version = new DocumentVersion
        {
            TenantId = tenantId,
            DocumentId = doc.Id,
            VersionNumber = 1,
            StorageProfileId = profile.Id,
            StorageObjectKey = uploadResult.ObjectKey,
            FileName = fileName,
            FileSize = fileSize,
            ContentType = contentType,
            Remarks = "Initial Version",
            UploadedBy = doc.UploadedBy,
            UploadedOn = doc.UploadedOn,
            IsCurrent = true,
            CreatedBy = doc.CreatedBy,
            CreatedDate = doc.CreatedDate,
            IPAddress = doc.IPAddress
        };
        _dbContext.DocumentVersions.Add(version);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Register Idempotency key if provided
        if (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            var reqHash = _idempotencyService.ComputeHash($"{tenantId}_{request.ApplicationId}_{request.ModuleCode}_{request.EntityType}_{request.EntityId}_{fileName}_{fileSize}");
            await _idempotencyService.RegisterKeyAsync(tenantId, doc.ApplicationId, idempotencyKey, reqHash, doc.Id, cancellationToken);
        }

        // 7. Audit & Webhook Trigger
        await _auditLogger.LogAsync(tenantId, doc.ApplicationId, _tenantContext.UserId, doc.Id, "UPLOAD", _tenantContext.ClientIpAddress, profile.ProviderCode, $"Uploaded '{fileName}'");
        await _webhookDispatcher.DispatchAsync(tenantId, doc.ApplicationId, "DocumentUploaded", new
        {
            DocumentId = doc.Id,
            DocumentPublicId = doc.PublicId,
            TenantId = doc.TenantId,
            ApplicationId = doc.ApplicationId,
            ModuleCode = doc.ModuleCode,
            EntityType = doc.EntityType,
            EntityId = doc.EntityId,
            DocumentTypeId = doc.DocumentTypeId,
            FileName = doc.FileName,
            OriginalFileName = doc.OriginalFileName,
            FileSize = doc.FileSize,
            ContentType = doc.ContentType,
            Extension = doc.Extension,
            Description = doc.Description,
            CurrentVersion = doc.CurrentVersion,
            Status = doc.Status,
            UploadedBy = doc.UploadedBy,
            UploadedOn = doc.UploadedOn
        });

        // 8. Save SQL Notification Record & Dispatch FCM Push
        var notif = new Notification
        {
            TenantId = tenantId,
            UserId = _tenantContext.UserId,
            DocumentId = doc.Id,
            Title = $"📄 New Document Uploaded: {doc.FileName}",
            Message = $"File '{doc.FileName}' ({(doc.FileSize / 1024.0):F1} KB) was uploaded into module '{doc.ModuleCode}'.",
            NotificationType = "SYSTEM",
            Status = "Sent",
            DataJson = System.Text.Json.JsonSerializer.Serialize(new { DocumentId = doc.Id, DocumentPublicId = doc.PublicId, StorageKey = doc.StorageObjectKey }),
            IsRead = false,
            CreatedDate = DateTime.UtcNow
        };
        _dbContext.Notifications.Add(notif);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var topic = await _configService.GetSettingAsync<string>("Firebase.DefaultTopic", tenantId, null, "dms-document-alerts", cancellationToken);
        _ = Task.Run(async () =>
        {
            await _firebaseService.SendTopicNotificationAsync(
                tenantId,
                topic ?? "dms-document-alerts",
                $"📄 New Document Uploaded: {doc.FileName}",
                $"File '{doc.FileName}' ({(doc.FileSize / 1024.0):F1} KB) was uploaded.",
                new { DocumentId = doc.Id, DocumentPublicId = doc.PublicId },
                CancellationToken.None);
        });

        return MapToDto(doc);
    }

    public async Task ValidateMandatoryDocumentTypesAsync(int tenantId, string? moduleCode, List<string> providedTypeCodes, CancellationToken cancellationToken = default)
    {
        var mandatoryTypeCodes = new List<(string Code, string Name)>();

        if (!string.IsNullOrWhiteSpace(moduleCode))
        {
            var mappedMandatory = await _dbContext.ModuleDocumentTypes
                .AsNoTracking()
                .Include(mdt => mdt.DocumentType)
                .Where(mdt => mdt.TenantId == tenantId && mdt.IsActive && mdt.IsMandatory && mdt.ModuleCode.ToUpper() == moduleCode.ToUpper())
                .Select(mdt => new { Code = mdt.DocumentType != null ? mdt.DocumentType.Code : "", Name = mdt.DocumentType != null ? mdt.DocumentType.Name : "" })
                .ToListAsync(cancellationToken);

            mandatoryTypeCodes.AddRange(mappedMandatory.Select(m => (m.Code, m.Name)));
        }

        var directMandatory = await _dbContext.DocumentTypes
            .AsNoTracking()
            .Where(dt => dt.TenantId == tenantId && dt.IsActive && dt.IsMandatory)
            .Where(dt => string.IsNullOrWhiteSpace(moduleCode) || dt.ModuleCode == null || dt.ModuleCode.ToUpper() == moduleCode.ToUpper())
            .Select(dt => new { dt.Code, dt.Name })
            .ToListAsync(cancellationToken);

        foreach (var dm in directMandatory)
        {
            if (!mandatoryTypeCodes.Any(m => m.Code.Equals(dm.Code, StringComparison.OrdinalIgnoreCase)))
            {
                mandatoryTypeCodes.Add((dm.Code, dm.Name));
            }
        }

        if (!mandatoryTypeCodes.Any()) return;

        var normalizedProvided = providedTypeCodes
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c.Trim().ToUpper())
            .ToHashSet();

        var missingDocs = mandatoryTypeCodes.Where(m => !normalizedProvided.Contains(m.Code.ToUpper())).ToList();

        if (missingDocs.Any())
        {
            var missingNames = string.Join(", ", missingDocs.Select(d => $"'{d.Name} ({d.Code})'"));
            throw new Microsoft.AspNetCore.Http.BadHttpRequestException($"Option A Atomic Upload Rejected: Missing mandatory document types: {missingNames}. All mandatory documents for module '{moduleCode ?? "GLOBAL"}' must be provided together.");
        }
    }

    public async Task<List<DocumentDto>> UploadBatchDocumentsAsync(List<(UploadDocumentRequest Request, Stream Stream, string FileName, string ContentType, long FileSize)> items, CancellationToken cancellationToken = default)
    {
        if (!items.Any()) return new List<DocumentDto>();

        var tenantId = _tenantContext.TenantId;
        var moduleCode = items.FirstOrDefault().Request?.ModuleCode;

        // 1. PRE-VALIDATION: Check mandatory document types BEFORE saving any file!
        var providedCodes = items
            .Select(i => i.Request.DocumentTypeCode)
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Select(c => c!)
            .ToList();

        await ValidateMandatoryDocumentTypesAsync(tenantId, moduleCode, providedCodes, cancellationToken);

        // 2. ATOMIC TRANSACTION: Save all files together inside a SQL transaction
        using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var uploadedDtos = new List<DocumentDto>();

        try
        {
            foreach (var item in items)
            {
                var dto = await UploadDocumentAsync(item.Request, item.Stream, item.FileName, item.ContentType, item.FileSize, null, cancellationToken);
                uploadedDtos.Add(dto);
            }

            await transaction.CommitAsync(cancellationToken);
            return uploadedDtos;
        }
        catch
        {
            try { await transaction.RollbackAsync(cancellationToken); } catch { }
            throw;
        }
    }

    public async Task<BulkUploadResultDto> BulkRegisterAsync(List<BulkRegisterItemRequest> requests, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var result = new BulkUploadResultDto { TotalSubmitted = requests.Count };

        foreach (var req in requests)
        {
            try
            {
                var profileId = req.StorageProfileId;
                if (!profileId.HasValue)
                {
                    var profile = await _routingService.ResolveStorageProfileAsync(
                        tenantId,
                        req.ApplicationId ?? _tenantContext.ApplicationId,
                        req.ModuleCode,
                        req.EntityType,
                        req.DocumentTypeId,
                        cancellationToken);
                    profileId = profile.Id;
                }

                var doc = new Document
                {
                    TenantId = tenantId,
                    ApplicationId = req.ApplicationId ?? _tenantContext.ApplicationId,
                    ModuleCode = req.ModuleCode,
                    EntityType = req.EntityType,
                    EntityId = req.EntityId,
                    StorageProfileId = profileId.Value,
                    StorageObjectKey = req.StorageObjectKey,
                    FileName = req.FileName,
                    OriginalFileName = req.FileName,
                    Extension = string.IsNullOrWhiteSpace(req.Extension) ? Path.GetExtension(req.FileName) : (req.Extension.StartsWith(".") ? req.Extension : "." + req.Extension),
                    ContentType = req.ContentType,
                    FileSize = req.FileSize,
                    DocumentTypeId = req.DocumentTypeId,
                    Description = req.Description,
                    CurrentVersion = 1,
                    Status = "Active",
                    UploadedBy = _tenantContext.UserId > 0 ? _tenantContext.UserId : 1,
                    UploadedOn = DateTime.UtcNow,
                    CreatedBy = _tenantContext.UserId > 0 ? _tenantContext.UserId : 1,
                    CreatedDate = DateTime.UtcNow,
                    IPAddress = _tenantContext.ClientIpAddress
                };

                _dbContext.Documents.Add(doc);
                await _dbContext.SaveChangesAsync(cancellationToken);

                var version = new DocumentVersion
                {
                    TenantId = tenantId,
                    DocumentId = doc.Id,
                    VersionNumber = 1,
                    StorageProfileId = profileId.Value,
                    StorageObjectKey = req.StorageObjectKey,
                    FileName = req.FileName,
                    FileSize = req.FileSize,
                    ContentType = req.ContentType,
                    Remarks = "Bulk Register",
                    UploadedBy = doc.UploadedBy,
                    UploadedOn = doc.UploadedOn,
                    IsCurrent = true,
                    CreatedBy = doc.CreatedBy,
                    CreatedDate = doc.CreatedDate,
                    IPAddress = doc.IPAddress
                };
                _dbContext.DocumentVersions.Add(version);
                await _dbContext.SaveChangesAsync(cancellationToken);

                result.TotalSucceeded++;
                result.Results.Add(new BulkUploadItemResult
                {
                    FileName = req.FileName,
                    Success = true,
                    Document = MapToDto(doc)
                });
            }
            catch (Exception ex)
            {
                result.TotalFailed++;
                result.Results.Add(new BulkUploadItemResult
                {
                    FileName = req.FileName,
                    Success = false,
                    ErrorMessage = ex.Message
                });
            }
        }

        return result;
    }

    public async Task<DocumentVersionDto> CreateVersionAsync(Guid documentPublicId, Stream fileStream, string fileName, string contentType, long fileSize, string? remarks, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;

        var doc = await _dbContext.Documents
            .Include(d => d.Versions)
            .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.PublicId == documentPublicId, cancellationToken);

        if (doc == null) throw new KeyNotFoundException("Document not found.");

        await _policyValidator.ValidateFileAsync(tenantId, fileName, fileSize, contentType, cancellationToken);

        var profile = await _dbContext.StorageProfiles.FindAsync(new object[] { doc.StorageProfileId }, cancellationToken);
        var provider = await _storageFactory.GetProviderAsync(profile!, cancellationToken);
        var uploadResult = await provider.UploadAsync(fileStream, fileName, contentType, null, cancellationToken);

        foreach (var v in doc.Versions) { v.IsCurrent = false; }

        var nextVersionNumber = doc.CurrentVersion + 1;
        doc.CurrentVersion = nextVersionNumber;
        doc.FileName = fileName;
        doc.FileSize = fileSize;
        doc.ContentType = contentType;
        doc.ModifiedBy = _tenantContext.UserId;
        doc.ModifiedDate = DateTime.UtcNow;

        var version = new DocumentVersion
        {
            TenantId = tenantId,
            DocumentId = doc.Id,
            VersionNumber = nextVersionNumber,
            StorageProfileId = profile!.Id,
            StorageObjectKey = uploadResult.ObjectKey,
            FileName = fileName,
            FileSize = fileSize,
            ContentType = contentType,
            Remarks = remarks ?? $"Version {nextVersionNumber}",
            UploadedBy = _tenantContext.UserId,
            UploadedOn = DateTime.UtcNow,
            IsCurrent = true,
            CreatedBy = _tenantContext.UserId,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.DocumentVersions.Add(version);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogger.LogAsync(tenantId, doc.ApplicationId, _tenantContext.UserId, doc.Id, "VERSION_CREATED", _tenantContext.ClientIpAddress, profile.ProviderCode, $"Created version {nextVersionNumber}");
        await _webhookDispatcher.DispatchAsync(tenantId, doc.ApplicationId, "DocumentVersionCreated", new { DocumentPublicId = doc.PublicId, VersionNumber = nextVersionNumber });

        return new DocumentVersionDto
        {
            PublicId = version.PublicId,
            VersionNumber = version.VersionNumber,
            FileName = version.FileName,
            FileSize = version.FileSize,
            ContentType = version.ContentType,
            Remarks = version.Remarks,
            UploadedOn = version.UploadedOn,
            IsCurrent = version.IsCurrent
        };
    }

    public async Task<DocumentDto> UpdateDocumentAsync(Guid publicId, UpdateDocumentRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var doc = await _dbContext.Documents
            .Include(d => d.StorageProfile)
            .Include(d => d.DocumentType)
            .Include(d => d.Versions)
            .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.PublicId == publicId, cancellationToken);

        if (doc == null) throw new KeyNotFoundException("Document not found.");

        if (!string.IsNullOrWhiteSpace(request.FileName)) doc.FileName = request.FileName.Trim();
        if (request.ModuleCode != null) doc.ModuleCode = request.ModuleCode.Trim();
        if (request.EntityType != null) doc.EntityType = request.EntityType.Trim();
        if (request.EntityId != null) doc.EntityId = request.EntityId.Trim();
        if (request.Description != null) doc.Description = request.Description.Trim();

        doc.ModifiedBy = _tenantContext.UserId;
        doc.ModifiedDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditLogger.LogAsync(tenantId, doc.ApplicationId, _tenantContext.UserId, doc.Id, "UPDATE_METADATA", _tenantContext.ClientIpAddress, null, $"Updated document '{doc.FileName}'");

        return MapToDto(doc);
    }

    public async Task<(Stream Stream, string ContentType, string FileName)> DownloadDocumentAsync(Guid documentPublicId, int? versionNumber = null, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var doc = await _dbContext.Documents
            .IgnoreQueryFilters()
            .Include(d => d.StorageProfile)
            .Include(d => d.Versions)
            .FirstOrDefaultAsync(d => d.PublicId == documentPublicId && (isSuperAdmin || d.TenantId == tenantId), cancellationToken);

        if (doc == null) throw new KeyNotFoundException("Document not found.");

        string objectKey = doc.StorageObjectKey;
        string fileName = doc.FileName;
        string contentType = doc.ContentType;
        int profileId = doc.StorageProfileId;

        if (versionNumber.HasValue)
        {
            var ver = doc.Versions.FirstOrDefault(v => v.VersionNumber == versionNumber.Value);
            if (ver != null)
            {
                objectKey = ver.StorageObjectKey;
                fileName = ver.FileName;
                contentType = ver.ContentType;
                profileId = ver.StorageProfileId;
            }
        }

        var profile = await _dbContext.StorageProfiles.FindAsync(new object[] { profileId }, cancellationToken);
        var provider = await _storageFactory.GetProviderAsync(profile!, cancellationToken);
        var stream = await provider.DownloadAsync(objectKey, cancellationToken);

        await _auditLogger.LogAsync(tenantId, doc.ApplicationId, _tenantContext.UserId, doc.Id, "DOWNLOAD", _tenantContext.ClientIpAddress, profile?.ProviderCode, $"Downloaded '{fileName}' (Ver: {versionNumber ?? doc.CurrentVersion})");

        return (stream, contentType, fileName);
    }

    public async Task<PagedResult<DocumentDto>> SearchDocumentsAsync(DocumentSearchRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var query = _dbContext.Documents
            .Include(d => d.StorageProfile)
            .Include(d => d.DocumentType)
            .AsNoTracking();

        if (!isSuperAdmin)
        {
            query = query.Where(d => d.TenantId == tenantId);
        }

        if (request.ApplicationId.HasValue) query = query.Where(d => d.ApplicationId == request.ApplicationId);
        if (!string.IsNullOrWhiteSpace(request.ModuleCode)) query = query.Where(d => d.ModuleCode == request.ModuleCode);
        if (!string.IsNullOrWhiteSpace(request.EntityType)) query = query.Where(d => d.EntityType == request.EntityType);
        if (!string.IsNullOrWhiteSpace(request.EntityId)) query = query.Where(d => d.EntityId == request.EntityId);
        if (request.FolderId.HasValue) query = query.Where(d => d.FolderId == request.FolderId);
        if (request.DocumentTypeId.HasValue) query = query.Where(d => d.DocumentTypeId == request.DocumentTypeId);

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.Trim();
            query = query.Where(d => d.FileName.Contains(term) || (d.Description != null && d.Description.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var pageIndex = request.PageIndex <= 0 ? 1 : request.PageIndex;
        var pageSize = request.PageSize <= 0 ? 20 : request.PageSize;

        var items = await query
            .OrderByDescending(d => d.CreatedDate)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(d => MapToDto(d))
            .ToListAsync(cancellationToken);

        return new PagedResult<DocumentDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        };
    }

    public async Task<DocumentDto?> GetByPublicIdAsync(Guid publicId, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var doc = await _dbContext.Documents
            .IgnoreQueryFilters()
            .Include(d => d.StorageProfile)
            .Include(d => d.DocumentType)
            .Include(d => d.Versions)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.PublicId == publicId && (isSuperAdmin || d.TenantId == tenantId), cancellationToken);

        return doc != null ? MapToDto(doc) : null;
    }

    public async Task SoftDeleteDocumentAsync(Guid publicId, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var doc = await _dbContext.Documents.FirstOrDefaultAsync(d => (isSuperAdmin || d.TenantId == tenantId) && d.PublicId == publicId, cancellationToken);
        if (doc == null) return;

        doc.IsDeleted = true;
        doc.DeletedBy = _tenantContext.UserId;
        doc.DeletedDate = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogger.LogAsync(doc.TenantId, doc.ApplicationId, _tenantContext.UserId, doc.Id, "DELETE", _tenantContext.ClientIpAddress, null, $"Soft-deleted document '{doc.FileName}' (PublicId: {doc.PublicId})");
        await _webhookDispatcher.DispatchAsync(doc.TenantId, doc.ApplicationId, "DocumentDeleted", new { DocumentPublicId = doc.PublicId });
    }

    public async Task RestoreDocumentAsync(Guid publicId, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var doc = await _dbContext.Documents.IgnoreQueryFilters().FirstOrDefaultAsync(d => (isSuperAdmin || d.TenantId == tenantId) && d.PublicId == publicId, cancellationToken);
        if (doc == null) return;

        doc.IsDeleted = false;
        doc.DeletedBy = null;
        doc.DeletedDate = null;
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogger.LogAsync(doc.TenantId, doc.ApplicationId, _tenantContext.UserId, doc.Id, "RESTORE", _tenantContext.ClientIpAddress, null, $"Restored document '{doc.FileName}' (PublicId: {doc.PublicId})");
        await _webhookDispatcher.DispatchAsync(doc.TenantId, doc.ApplicationId, "DocumentRestored", new { DocumentPublicId = doc.PublicId });
    }

    private static string BuildFolderPath(string pattern, string tenantCode, int tenantId, string? moduleCode, string? entityType, string? entityId)
    {
        var now = DateTime.UtcNow;
        var path = pattern
            .Replace("{TenantCode}", string.IsNullOrWhiteSpace(tenantCode) ? "" : tenantCode, StringComparison.OrdinalIgnoreCase)
            .Replace("{TenantId}", tenantId.ToString(), StringComparison.OrdinalIgnoreCase)
            .Replace("{Year}", now.ToString("yyyy"), StringComparison.OrdinalIgnoreCase)
            .Replace("{Month}", now.ToString("MM"), StringComparison.OrdinalIgnoreCase)
            .Replace("{Day}", now.ToString("dd"), StringComparison.OrdinalIgnoreCase)
            .Replace("{ModuleCode}", string.IsNullOrWhiteSpace(moduleCode) ? "" : moduleCode.Trim(), StringComparison.OrdinalIgnoreCase)
            .Replace("{EntityType}", string.IsNullOrWhiteSpace(entityType) ? "" : entityType.Trim(), StringComparison.OrdinalIgnoreCase)
            .Replace("{EntityId}", string.IsNullOrWhiteSpace(entityId) ? "" : entityId.Trim(), StringComparison.OrdinalIgnoreCase);

        var segments = path.Split(new[] { '/', '\\' }, StringSplitOptions.RemoveEmptyEntries);
        return string.Join("/", segments);
    }

    private static DocumentDto MapToDto(Document d)
    {
        var downloadUrl = $"/api/v1/documents/{d.PublicId}/download";
        var previewUrl = $"/api/v1/documents/{d.PublicId}/preview";
        var basePath = Path.Combine(Directory.GetCurrentDirectory(), "Storage");
        var fullPhysicalPath = Path.Combine(basePath, d.StorageObjectKey.Replace("/", "\\"));

        var uploaderName = !string.IsNullOrWhiteSpace(d.EntityId)
            ? $"{d.EntityId} ({d.EntityType ?? "User"})"
            : $"User #{d.UploadedBy}";

        return new DocumentDto
        {
            Id = d.Id,
            PublicId = d.PublicId,
            DownloadUrl = downloadUrl,
            PreviewUrl = previewUrl,
            FullPhysicalPath = fullPhysicalPath,
            TenantId = d.TenantId,
            ApplicationId = d.ApplicationId,
            ModuleCode = d.ModuleCode,
            EntityType = d.EntityType,
            EntityId = d.EntityId,
            FolderId = d.FolderId,
            StorageObjectKey = d.StorageObjectKey,
            FileName = d.FileName,
            OriginalFileName = d.OriginalFileName,
            Extension = d.Extension,
            ContentType = d.ContentType,
            FileSize = d.FileSize,
            CurrentVersion = d.CurrentVersion,
            Status = d.Status,
            UploadedOn = d.UploadedOn,
            UploadedByName = uploaderName,
            CreatedByName = uploaderName,
            StorageProfileName = d.StorageProfile?.Name ?? "Storage",
            ProviderCode = d.StorageProfile?.ProviderCode ?? "LOCAL",
            DocumentTypeId = d.DocumentTypeId,
            DocumentTypeCode = d.DocumentType?.Code,
            DocumentTypeName = d.DocumentType?.Name,
            Description = d.Description,
            Versions = d.Versions?.Select(v => new DocumentVersionDto
            {
                PublicId = v.PublicId,
                VersionNumber = v.VersionNumber,
                FileName = v.FileName,
                FileSize = v.FileSize,
                ContentType = v.ContentType,
                Remarks = v.Remarks,
                UploadedOn = v.UploadedOn,
                IsCurrent = v.IsCurrent
            }).OrderByDescending(v => v.VersionNumber).ToList() ?? new List<DocumentVersionDto>()
        };
    }
}
