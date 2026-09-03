using DMS.Api.Common;
using DMS.Api.Data;
using DMS.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DMS.Api.Services;

public interface IFilePolicyValidator
{
    Task ValidateFileAsync(int tenantId, string fileName, long fileSize, string contentType, CancellationToken cancellationToken = default);
}

public class FilePolicyValidator : IFilePolicyValidator
{
    private readonly DmsDbContext _dbContext;
    private readonly IConfigSettingsService _configService;

    public FilePolicyValidator(DmsDbContext dbContext, IConfigSettingsService configService)
    {
        _dbContext = dbContext;
        _configService = configService;
    }

    public async Task ValidateFileAsync(int tenantId, string fileName, long fileSize, string contentType, CancellationToken cancellationToken = default)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();

        // Check explicit TenantFilePolicy first
        var policy = await _dbContext.TenantFilePolicies
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.TenantId == tenantId && p.IsActive, cancellationToken);

        long maxFileSize = policy?.MaxFileSize ?? 0;
        string allowedExtsStr = policy?.AllowedExtensions ?? "";
        string blockedExtsStr = policy?.BlockedExtensions ?? "";

        // If not present in TenantFilePolicies, resolve dynamically from ConfigSettings SQL table
        if (maxFileSize <= 0)
        {
            var maxMb = await _configService.GetSettingAsync<long>("System.MaxFileSizeMB", tenantId, defaultValue: 100, cancellationToken: cancellationToken);
            maxFileSize = maxMb * 1024 * 1024;
        }

        if (string.IsNullOrWhiteSpace(allowedExtsStr))
        {
            allowedExtsStr = await _configService.GetSettingAsync<string>("System.AllowedExtensions", tenantId, defaultValue: ".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.zip", cancellationToken: cancellationToken) ?? "";
        }

        if (string.IsNullOrWhiteSpace(blockedExtsStr))
        {
            blockedExtsStr = await _configService.GetSettingAsync<string>("System.BlockedExtensions", tenantId, defaultValue: ".exe,.bat,.cmd,.dll,.sh,.vbs,.scr", cancellationToken: cancellationToken) ?? "";
        }

        // 1. File size check
        if (maxFileSize > 0 && fileSize > maxFileSize)
        {
            var maxMb = maxFileSize / (1024 * 1024);
            throw new BadHttpRequestException($"File size exceeds maximum allowed limit of {maxMb} MB.");
        }

        // 2. Blocked extensions check
        if (!string.IsNullOrWhiteSpace(blockedExtsStr))
        {
            var blocked = blockedExtsStr.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(e => e.StartsWith(".") ? e.ToLowerInvariant() : "." + e.ToLowerInvariant());

            if (blocked.Contains(ext))
            {
                throw new BadHttpRequestException($"Files with extension '{ext}' are blocked by security policy.");
            }
        }

        // 3. Allowed extensions check
        if (!string.IsNullOrWhiteSpace(allowedExtsStr))
        {
            var allowed = allowedExtsStr.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(e => e.StartsWith(".") ? e.ToLowerInvariant() : "." + e.ToLowerInvariant());

            if (!allowed.Contains(ext))
            {
                throw new BadHttpRequestException($"Files with extension '{ext}' are not permitted by policy.");
            }
        }
    }
}
