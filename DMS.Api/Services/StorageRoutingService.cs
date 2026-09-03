using DMS.Api.Data;
using DMS.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DMS.Api.Services;

public interface IStorageRoutingService
{
    Task<StorageProfile> ResolveStorageProfileAsync(
        int tenantId,
        int? applicationId,
        string? moduleCode,
        string? entityType,
        int? documentTypeId,
        CancellationToken cancellationToken = default);
}

public class StorageRoutingService : IStorageRoutingService
{
    private readonly DmsDbContext _dbContext;
    private readonly IMemoryCache _memoryCache;

    public StorageRoutingService(DmsDbContext dbContext, IMemoryCache memoryCache)
    {
        _dbContext = dbContext;
        _memoryCache = memoryCache;
    }

    public async Task<StorageProfile> ResolveStorageProfileAsync(
        int tenantId,
        int? applicationId,
        string? moduleCode,
        string? entityType,
        int? documentTypeId,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"Routing_{tenantId}_{applicationId}_{moduleCode}_{entityType}_{documentTypeId}";

        return await _memoryCache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);

            var rules = await _dbContext.StorageRoutingRules
                .Include(r => r.StorageProfile)
                .AsNoTracking()
                .Where(r => r.TenantId == tenantId && r.IsActive)
                .OrderByDescending(r => r.Priority ?? 0)
                .ToListAsync(cancellationToken);

            foreach (var rule in rules)
            {
                if (rule.ApplicationId.HasValue && rule.ApplicationId != applicationId) continue;
                if (!string.IsNullOrWhiteSpace(rule.ModuleCode) && !string.Equals(rule.ModuleCode, moduleCode, StringComparison.OrdinalIgnoreCase)) continue;
                if (!string.IsNullOrWhiteSpace(rule.EntityType) && !string.Equals(rule.EntityType, entityType, StringComparison.OrdinalIgnoreCase)) continue;
                if (rule.DocumentTypeId.HasValue && rule.DocumentTypeId != documentTypeId) continue;

                if (rule.StorageProfile != null && rule.StorageProfile.IsActive)
                {
                    return rule.StorageProfile;
                }
            }

            var defaultProfile = await _dbContext.StorageProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(sp => sp.TenantId == tenantId && sp.IsDefault && sp.IsActive, cancellationToken)
                ?? await _dbContext.StorageProfiles
                .AsNoTracking()
                .FirstOrDefaultAsync(sp => sp.TenantId == tenantId && sp.IsActive, cancellationToken);

            if (defaultProfile == null)
            {
                defaultProfile = await _dbContext.StorageProfiles
                    .AsNoTracking()
                    .FirstOrDefaultAsync(sp => sp.IsActive, cancellationToken);
            }

            if (defaultProfile == null)
            {
                var newProfile = new StorageProfile
                {
                    TenantId = tenantId,
                    Name = $"Auto Default Local Storage (Tenant {tenantId})",
                    ProviderCode = "LOCAL",
                    IsDefault = true,
                    IsActive = true,
                    CreatedDate = DateTime.UtcNow
                };
                _dbContext.StorageProfiles.Add(newProfile);
                await _dbContext.SaveChangesAsync(cancellationToken);
                defaultProfile = newProfile;
            }

            return defaultProfile;
        }) ?? new StorageProfile
        {
            TenantId = tenantId,
            Name = "Emergency Local Storage",
            ProviderCode = "LOCAL",
            IsDefault = true,
            IsActive = true
        };
    }
}
