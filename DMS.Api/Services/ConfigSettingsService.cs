using System.Text.Json;
using DMS.Api.Data;
using DMS.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DMS.Api.Services;

public interface IConfigSettingsService
{
    Task<T?> GetSettingAsync<T>(string key, int? tenantId = null, int? applicationId = null, T? defaultValue = default, CancellationToken cancellationToken = default);
    Task<string?> GetRawSettingAsync(string key, int? tenantId = null, int? applicationId = null, CancellationToken cancellationToken = default);
    Task SetSettingAsync(string key, string? value, string category = "SYSTEM", int? tenantId = null, int? applicationId = null, string dataType = "String", string? description = null, CancellationToken cancellationToken = default);
    Task<List<ConfigSetting>> GetSettingsAsync(int? tenantId = null, string? category = null, CancellationToken cancellationToken = default);
}

public class ConfigSettingsService : IConfigSettingsService
{
    private readonly DmsDbContext _dbContext;
    private readonly IMemoryCache _memoryCache;

    public ConfigSettingsService(DmsDbContext dbContext, IMemoryCache memoryCache)
    {
        _dbContext = dbContext;
        _memoryCache = memoryCache;
    }

    public async Task<string?> GetRawSettingAsync(string key, int? tenantId = null, int? applicationId = null, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"ConfigSetting_{tenantId}_{applicationId}_{key}";

        return await _memoryCache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);

            // Precedence 1: App-specific override
            if (tenantId.HasValue && applicationId.HasValue)
            {
                var appSetting = await _dbContext.ConfigSettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.ApplicationId == applicationId && c.SettingKey == key && c.IsActive, cancellationToken);
                if (appSetting != null) return appSetting.SettingValue;
            }

            // Precedence 2: Tenant-wide setting
            if (tenantId.HasValue)
            {
                var tenantSetting = await _dbContext.ConfigSettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.ApplicationId == null && c.SettingKey == key && c.IsActive, cancellationToken);
                if (tenantSetting != null) return tenantSetting.SettingValue;
            }

            // Precedence 3: Global Platform setting
            var globalSetting = await _dbContext.ConfigSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.TenantId == null && c.ApplicationId == null && c.SettingKey == key && c.IsActive, cancellationToken);

            return globalSetting?.SettingValue;
        });
    }

    public async Task<T?> GetSettingAsync<T>(string key, int? tenantId = null, int? applicationId = null, T? defaultValue = default, CancellationToken cancellationToken = default)
    {
        var raw = await GetRawSettingAsync(key, tenantId, applicationId, cancellationToken);
        if (string.IsNullOrWhiteSpace(raw)) return defaultValue;

        try
        {
            var targetType = Nullable.GetUnderlyingType(typeof(T)) ?? typeof(T);

            if (targetType == typeof(string)) return (T)(object)raw;
            if (targetType == typeof(int)) return (T)(object)int.Parse(raw);
            if (targetType == typeof(long)) return (T)(object)long.Parse(raw);
            if (targetType == typeof(bool)) return (T)(object)bool.Parse(raw);
            if (targetType == typeof(double)) return (T)(object)double.Parse(raw);

            return JsonSerializer.Deserialize<T>(raw) ?? defaultValue;
        }
        catch
        {
            return defaultValue;
        }
    }

    public async Task SetSettingAsync(string key, string? value, string category = "SYSTEM", int? tenantId = null, int? applicationId = null, string dataType = "String", string? description = null, CancellationToken cancellationToken = default)
    {
        var setting = await _dbContext.ConfigSettings
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.ApplicationId == applicationId && c.SettingKey == key, cancellationToken);

        if (setting == null)
        {
            setting = new ConfigSetting
            {
                TenantId = tenantId,
                ApplicationId = applicationId,
                Category = category,
                SettingKey = key,
                SettingValue = value,
                DataType = dataType,
                Description = description,
                CreatedDate = DateTime.UtcNow
            };
            _dbContext.ConfigSettings.Add(setting);
        }
        else
        {
            setting.SettingValue = value;
            setting.Category = category;
            setting.DataType = dataType;
            setting.Description = description ?? setting.Description;
            setting.ModifiedDate = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        // Evict cache entry
        _memoryCache.Remove($"ConfigSetting_{tenantId}_{applicationId}_{key}");
    }

    public async Task<List<ConfigSetting>> GetSettingsAsync(int? tenantId = null, string? category = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.ConfigSettings.AsNoTracking();

        if (tenantId.HasValue)
        {
            query = query.Where(c => c.TenantId == tenantId || c.TenantId == null);
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(c => c.Category == category);
        }

        return await query.OrderBy(c => c.Category).ThenBy(c => c.SettingKey).ToListAsync(cancellationToken);
    }
}
