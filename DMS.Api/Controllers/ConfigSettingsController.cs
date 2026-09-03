using DMS.Api.Authorization;
using DMS.Api.Common;
using DMS.Api.Data;
using DMS.Api.DTOs;
using DMS.Api.Entities;
using DMS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DMS.Api.Controllers;

[ApiController]
[Route("api/v1/config-settings")]
[Authorize]
public class ConfigSettingsController : ControllerBase
{
    private readonly IConfigSettingsService _configService;
    private readonly ITenantContext _tenantContext;
    private readonly DmsDbContext _dbContext;
    private readonly IMemoryCache _memoryCache;

    public ConfigSettingsController(
        IConfigSettingsService configService,
        ITenantContext tenantContext,
        DmsDbContext dbContext,
        IMemoryCache memoryCache)
    {
        _configService = configService;
        _tenantContext = tenantContext;
        _dbContext = dbContext;
        _memoryCache = memoryCache;
    }

    [HttpGet]
    public async Task<IActionResult> GetSettings(
        [FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? category = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var query = _dbContext.ConfigSettings.AsNoTracking();

        if (!isSuperAdmin)
        {
            query = query.Where(c => c.TenantId == tenantId || c.TenantId == null);
        }

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(c => c.Category == category);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(c => c.SettingKey.ToLower().Contains(s) || (c.Description != null && c.Description.ToLower().Contains(s)) || c.Category.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(c => c.Category)
            .ThenBy(c => c.SettingKey)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new
            {
                s.Id,
                s.PublicId,
                s.TenantId,
                s.ApplicationId,
                s.Category,
                s.SettingKey,
                s.SettingValue,
                s.DataType,
                s.IsEncrypted,
                s.Description,
                s.IsActive
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<PagedResult<object>>.Ok(new PagedResult<object>
        {
            Items = items.Cast<object>().ToList(),
            TotalCount = total,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        }));
    }

    [HttpGet("{key}")]
    public async Task<IActionResult> GetSettingByKey(string key, [FromQuery] int? applicationId, CancellationToken cancellationToken)
    {
        var rawValue = await _configService.GetRawSettingAsync(key, _tenantContext.TenantId, applicationId, cancellationToken);
        if (rawValue == null)
        {
            return NotFound(ApiResponse.Fail("DMS014", $"Configuration setting '{key}' not found."));
        }

        return Ok(ApiResponse<object>.Ok(new { Key = key, Value = rawValue }));
    }

    [HttpPost]
    public async Task<IActionResult> SaveSetting([FromBody] SaveConfigSettingRequest request, CancellationToken cancellationToken)
    {
        await _configService.SetSettingAsync(
            request.SettingKey,
            request.SettingValue,
            request.Category ?? "SYSTEM",
            request.IsTenantSpecific ? _tenantContext.TenantId : null,
            request.ApplicationId,
            request.DataType ?? "String",
            request.Description,
            cancellationToken);

        return Ok(ApiResponse.Ok($"Configuration setting '{request.SettingKey}' saved successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateSetting(int id, [FromBody] SaveConfigSettingRequest request, CancellationToken cancellationToken)
    {
        var setting = await _dbContext.ConfigSettings.FindAsync(new object[] { id }, cancellationToken);
        if (setting == null)
        {
            return NotFound(ApiResponse.Fail("DMS014", $"Setting #{id} not found."));
        }

        setting.SettingValue = request.SettingValue;
        setting.Category = request.Category ?? setting.Category;
        setting.DataType = request.DataType ?? setting.DataType;
        setting.Description = request.Description ?? setting.Description;
        setting.ModifiedDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        _memoryCache.Remove($"ConfigSetting_{setting.TenantId}_{setting.ApplicationId}_{setting.SettingKey}");

        return Ok(ApiResponse.Ok($"Setting '{setting.SettingKey}' updated successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteSetting(int id, CancellationToken cancellationToken)
    {
        var setting = await _dbContext.ConfigSettings.FindAsync(new object[] { id }, cancellationToken);
        if (setting == null)
        {
            return NotFound(ApiResponse.Fail("DMS014", $"Setting #{id} not found."));
        }

        _dbContext.ConfigSettings.Remove(setting);
        await _dbContext.SaveChangesAsync(cancellationToken);
        _memoryCache.Remove($"ConfigSetting_{setting.TenantId}_{setting.ApplicationId}_{setting.SettingKey}");

        return Ok(ApiResponse.Ok($"Setting '{setting.SettingKey}' deleted successfully."));
    }

    [HttpPost("seed-defaults")]
    public async Task<IActionResult> SeedDefaultSettings(CancellationToken cancellationToken)
    {
        var defaultSettings = new List<ConfigSetting>
        {
            // FIREBASE (Push Notifications)
            new ConfigSetting { SettingKey = "Firebase.EnablePushNotifications", SettingValue = "true", Category = "FIREBASE", DataType = "Boolean", Description = "Enable / Disable Firebase Push Notifications" },
            new ConfigSetting { SettingKey = "Firebase.ProjectId", SettingValue = "dms-platform-firebase", Category = "FIREBASE", DataType = "String", Description = "Firebase Project Console ID" },
            new ConfigSetting { SettingKey = "Firebase.ServerKey", SettingValue = "AAAA-FIREBASE-SERVER-KEY-MOCK-123456", Category = "FIREBASE", DataType = "Encrypted", Description = "Firebase FCM Server Key / OAuth Token" },
            new ConfigSetting { SettingKey = "Firebase.DefaultTopic", SettingValue = "dms-document-alerts", Category = "FIREBASE", DataType = "String", Description = "Default FCM Broadcast Topic Channel" },
            new ConfigSetting { SettingKey = "Firebase.FcmEndpoint", SettingValue = "https://fcm.googleapis.com/fcm/send", Category = "FIREBASE", DataType = "String", Description = "Google FCM Push Notification API Endpoint" },

            // SMTP (Email Notifications)
            new ConfigSetting { SettingKey = "SMTP.EnableEmailNotifications", SettingValue = "true", Category = "SMTP", DataType = "Boolean", Description = "Enable / Disable Email Notifications" },
            new ConfigSetting { SettingKey = "SMTP.Host", SettingValue = "smtp.gmail.com", Category = "SMTP", DataType = "String", Description = "SMTP Server Host Address" },
            new ConfigSetting { SettingKey = "SMTP.Port", SettingValue = "587", Category = "SMTP", DataType = "Number", Description = "SMTP Server TLS Port" },
            new ConfigSetting { SettingKey = "SMTP.Username", SettingValue = "notifications@dms-platform.com", Category = "SMTP", DataType = "String", Description = "SMTP Sender Username" },
            new ConfigSetting { SettingKey = "SMTP.Password", SettingValue = "app-password-secret-123", Category = "SMTP", DataType = "Encrypted", Description = "SMTP Account App Password" },
            new ConfigSetting { SettingKey = "SMTP.EnableSsl", SettingValue = "true", Category = "SMTP", DataType = "Boolean", Description = "Enable TLS/SSL Encryption" },
            new ConfigSetting { SettingKey = "SMTP.FromEmail", SettingValue = "noreply@dms-platform.com", Category = "SMTP", DataType = "String", Description = "Sender Display Email Address" },
            new ConfigSetting { SettingKey = "SMTP.FromName", SettingValue = "Antigravity DMS Platform", Category = "SMTP", DataType = "String", Description = "Sender Display Name" },

            // STORAGE (Storage Profiles & Pathing)
            new ConfigSetting { SettingKey = "Storage.DefaultProvider", SettingValue = "LOCAL", Category = "STORAGE", DataType = "String", Description = "System Default Storage Provider (LOCAL, AWS_S3, AZURE_BLOB)" },
            new ConfigSetting { SettingKey = "Storage.FolderPathPattern", SettingValue = "{TenantCode}/{Year}/{Month}/{Day}/{ModuleCode}/{EntityType}/{EntityId}", Category = "STORAGE", DataType = "String", Description = "Dynamic Storage Folder Path Pattern Template" },
            new ConfigSetting { SettingKey = "Storage.LocalBasePath", SettingValue = @"D:\DMS\DMS.Api\Storage", Category = "STORAGE", DataType = "String", Description = "Local File Storage Root Path" },
            new ConfigSetting { SettingKey = "Storage.MaxFileSizeBytes", SettingValue = "104857600", Category = "STORAGE", DataType = "Number", Description = "Default Max File Size (100MB)" },
            new ConfigSetting { SettingKey = "Storage.EnableChunkedUpload", SettingValue = "true", Category = "STORAGE", DataType = "Boolean", Description = "Enable Multipart Chunked File Upload" },
            new ConfigSetting { SettingKey = "Storage.ChunkSizeBytes", SettingValue = "5242880", Category = "STORAGE", DataType = "Number", Description = "Multipart Chunk Size (5MB)" },

            // SECURITY (File Validation & Anti-Virus)
            new ConfigSetting { SettingKey = "Security.AllowedExtensions", SettingValue = ".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.zip,.csv", Category = "SECURITY", DataType = "String", Description = "Global Allowed File Extensions" },
            new ConfigSetting { SettingKey = "Security.BlockedExtensions", SettingValue = ".exe,.bat,.cmd,.dll,.sh,.vbs,.scr", Category = "SECURITY", DataType = "String", Description = "Global Blocked File Extensions" },
            new ConfigSetting { SettingKey = "Security.EnableVirusScan", SettingValue = "false", Category = "SECURITY", DataType = "Boolean", Description = "Enable Anti-Virus File Scanner" },
            new ConfigSetting { SettingKey = "Security.ClamAvHost", SettingValue = "localhost", Category = "SECURITY", DataType = "String", Description = "ClamAV Anti-Virus Server Host" },
            new ConfigSetting { SettingKey = "Security.ClamAvPort", SettingValue = "3310", Category = "SECURITY", DataType = "Number", Description = "ClamAV Anti-Virus Server Port" },
            new ConfigSetting { SettingKey = "Security.MaxVersionsPerDocument", SettingValue = "10", Category = "SECURITY", DataType = "Number", Description = "Maximum Document Version History Retained" },

            // JWT (Authentication & Security Tokens)
            new ConfigSetting { SettingKey = "Jwt.SecretKey", SettingValue = "dms_super_secret_jwt_key_2026_antigravity_platform", Category = "JWT", DataType = "Encrypted", Description = "Global Cryptographically Generated JWT Signing Key" },
            new ConfigSetting { SettingKey = "Jwt.ExpiryMinutes", SettingValue = "480", Category = "JWT", DataType = "Number", Description = "JWT Token Expiry (8 Hours)" },
            new ConfigSetting { SettingKey = "Jwt.Issuer", SettingValue = "AntigravityDmsApi", Category = "JWT", DataType = "String", Description = "JWT Valid Token Issuer" },
            new ConfigSetting { SettingKey = "Jwt.Audience", SettingValue = "AntigravityDmsClients", Category = "JWT", DataType = "String", Description = "JWT Valid Token Audience" },

            // WEBHOOKS (Webhook Event Dispatching)
            new ConfigSetting { SettingKey = "Webhooks.EnableWebhooks", SettingValue = "true", Category = "WEBHOOKS", DataType = "Boolean", Description = "Enable / Disable Real-Time Webhook Dispatching" },
            new ConfigSetting { SettingKey = "Webhooks.MaxRetryAttempts", SettingValue = "3", Category = "WEBHOOKS", DataType = "Number", Description = "Failed Webhook Maximum Retry Attempts" },
            new ConfigSetting { SettingKey = "Webhooks.RetryIntervalSeconds", SettingValue = "60", Category = "WEBHOOKS", DataType = "Number", Description = "Webhook Retry Backoff Interval Seconds" },

            // SYSTEM (Platform Operations & Caching)
            new ConfigSetting { SettingKey = "System.EnableAuditLogging", SettingValue = "true", Category = "SYSTEM", DataType = "Boolean", Description = "Enable / Disable Immutable Audit Logging" },
            new ConfigSetting { SettingKey = "System.MigrationPollIntervalSeconds", SettingValue = "5", Category = "SYSTEM", DataType = "Number", Description = "Storage Migration Worker Poll Interval" },
            new ConfigSetting { SettingKey = "System.CacheExpiryMinutes", SettingValue = "60", Category = "SYSTEM", DataType = "Number", Description = "System In-Memory Cache Expiry Duration" }
        };

        int addedCount = 0;
        foreach (var setting in defaultSettings)
        {
            var exists = await _dbContext.ConfigSettings.AnyAsync(c => c.SettingKey == setting.SettingKey, cancellationToken);
            if (!exists)
            {
                _dbContext.ConfigSettings.Add(setting);
                addedCount++;
            }
        }

        if (addedCount > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return Ok(ApiResponse.Ok($"Seeded {addedCount} default configuration settings into SQL database."));
    }
}

public class SaveConfigSettingRequest
{
    public string SettingKey { get; set; } = string.Empty;
    public string? SettingValue { get; set; }
    public string? Category { get; set; } = "SYSTEM";
    public bool IsTenantSpecific { get; set; } = true;
    public int? ApplicationId { get; set; }
    public string? DataType { get; set; } = "String";
    public string? Description { get; set; }
}
