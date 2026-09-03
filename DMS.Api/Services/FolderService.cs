using DMS.Api.Authorization;
using DMS.Api.Data;
using DMS.Api.DTOs;
using DMS.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DMS.Api.Services;

public interface IFolderService
{
    Task<FolderDto> CreateFolderAsync(CreateFolderRequest request, CancellationToken cancellationToken = default);
    Task<FolderDto> UpdateFolderAsync(Guid publicId, UpdateFolderRequest request, CancellationToken cancellationToken = default);
    Task<List<FolderDto>> GetFolderHierarchyAsync(int? parentFolderId = null, CancellationToken cancellationToken = default);
    Task SoftDeleteFolderAsync(Guid publicId, CancellationToken cancellationToken = default);
}

public class FolderService : IFolderService
{
    private readonly DmsDbContext _dbContext;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;

    public FolderService(DmsDbContext dbContext, ITenantContext tenantContext, IAuditLogger auditLogger)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
    }

    public async Task<FolderDto> CreateFolderAsync(CreateFolderRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;

        var folder = new Folder
        {
            PublicId = Guid.NewGuid(),
            TenantId = tenantId,
            ApplicationId = request.ApplicationId ?? _tenantContext.ApplicationId,
            ModuleCode = request.ModuleCode,
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            ParentFolderId = request.ParentFolderId,
            Name = request.Name,
            CreatedBy = _tenantContext.UserId > 0 ? _tenantContext.UserId : 1,
            CreatedDate = DateTime.UtcNow,
            IPAddress = _tenantContext.ClientIpAddress
        };

        _dbContext.Folders.Add(folder);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditLogger.LogAsync(tenantId, folder.ApplicationId, _tenantContext.UserId, null, "CREATE_FOLDER", _tenantContext.ClientIpAddress, null, $"Created folder '{folder.Name}'");

        return MapToDto(folder);
    }

    public async Task<FolderDto> UpdateFolderAsync(Guid publicId, UpdateFolderRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var folder = await _dbContext.Folders.FirstOrDefaultAsync(f => f.PublicId == publicId && (isSuperAdmin || f.TenantId == tenantId), cancellationToken);
        if (folder == null && publicId == Guid.Empty)
        {
            folder = await _dbContext.Folders.FirstOrDefaultAsync(f => (isSuperAdmin || f.TenantId == tenantId) && f.Name == request.Name.Trim(), cancellationToken);
        }

        if (folder == null) throw new KeyNotFoundException("Folder not found.");

        if (folder.PublicId == Guid.Empty)
        {
            folder.PublicId = Guid.NewGuid();
        }

        folder.Name = request.Name.Trim();
        if (!string.IsNullOrWhiteSpace(request.ModuleCode)) folder.ModuleCode = request.ModuleCode;
        if (request.EntityType != null) folder.EntityType = request.EntityType;
        if (request.EntityId != null) folder.EntityId = request.EntityId;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditLogger.LogAsync(tenantId, folder.ApplicationId, _tenantContext.UserId, null, "UPDATE_FOLDER", _tenantContext.ClientIpAddress, null, $"Updated folder '{folder.Name}'");

        return MapToDto(folder);
    }

    public async Task<List<FolderDto>> GetFolderHierarchyAsync(int? parentFolderId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var query = _dbContext.Folders
            .Include(f => f.SubFolders)
            .Include(f => f.Documents)
            .AsNoTracking();

        if (!isSuperAdmin)
        {
            query = query.Where(f => f.TenantId == tenantId);
        }

        if (parentFolderId.HasValue)
        {
            query = query.Where(f => f.ParentFolderId == parentFolderId);
        }

        var folders = await query.OrderBy(f => f.Name).ToListAsync(cancellationToken);

        // Auto-heal any legacy folders missing PublicId
        var hasUnassigned = false;
        foreach (var f in folders)
        {
            if (f.PublicId == Guid.Empty)
            {
                f.PublicId = Guid.NewGuid();
                var track = await _dbContext.Folders.FindAsync(new object[] { f.Id }, cancellationToken);
                if (track != null)
                {
                    track.PublicId = f.PublicId;
                    hasUnassigned = true;
                }
            }
        }

        if (hasUnassigned)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return folders.Select(f => MapToDto(f)).ToList();
    }

    public async Task SoftDeleteFolderAsync(Guid publicId, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");

        var folder = await _dbContext.Folders.FirstOrDefaultAsync(f => f.PublicId == publicId && (isSuperAdmin || f.TenantId == tenantId), cancellationToken);
        if (folder == null) return;

        folder.IsDeleted = true;
        folder.DeletedBy = _tenantContext.UserId;
        folder.DeletedDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditLogger.LogAsync(tenantId, folder.ApplicationId, _tenantContext.UserId, null, "DELETE_FOLDER", _tenantContext.ClientIpAddress, null, $"Soft-deleted folder '{folder.Name}'");
    }

    private static FolderDto MapToDto(Folder f)
    {
        return new FolderDto
        {
            Id = f.Id,
            PublicId = f.PublicId,
            TenantId = f.TenantId,
            ApplicationId = f.ApplicationId,
            ModuleCode = f.ModuleCode,
            EntityType = f.EntityType,
            EntityId = f.EntityId,
            ParentFolderId = f.ParentFolderId,
            Name = f.Name,
            CreatedDate = f.CreatedDate,
            SubFolderCount = f.SubFolders?.Count ?? 0,
            DocumentCount = f.Documents?.Count ?? 0
        };
    }
}
