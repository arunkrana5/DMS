using System.Text.Json;
using DMS.Api.Data;
using DMS.Api.Entities;
using DMS.Api.Storage.Abstractions;
using DMS.Api.Storage.Providers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DMS.Api.Storage.Factory;

public class StorageProviderFactory : IStorageProviderFactory
{
    private readonly DmsDbContext _dbContext;
    private readonly IMemoryCache _memoryCache;
    private readonly IConfiguration _configuration;

    public StorageProviderFactory(DmsDbContext dbContext, IMemoryCache memoryCache, IConfiguration configuration)
    {
        _dbContext = dbContext;
        _memoryCache = memoryCache;
        _configuration = configuration;
    }

    public async Task<IStorageProvider> GetProviderAsync(StorageProfile profile, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"StorageProvider_{profile.Id}_{profile.ModifiedDate?.Ticks ?? profile.CreatedDate.Ticks}";

        return await _memoryCache.GetOrCreateAsync(cacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);
            return Task.FromResult(CreateProviderInstance(profile));
        }) ?? CreateProviderInstance(profile);
    }

    public async Task<IStorageProvider> GetDefaultProviderAsync(int tenantId, CancellationToken cancellationToken = default)
    {
        var defaultProfile = await _dbContext.StorageProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(sp => sp.TenantId == tenantId && sp.IsDefault, cancellationToken)
            ?? await _dbContext.StorageProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(sp => sp.TenantId == tenantId, cancellationToken);

        if (defaultProfile == null)
        {
            var fallbackPath = Path.Combine(Directory.GetCurrentDirectory(), "Storage", $"Tenant_{tenantId}");
            return new LocalStorageProvider(fallbackPath);
        }

        return await GetProviderAsync(defaultProfile, cancellationToken);
    }

    private IStorageProvider CreateProviderInstance(StorageProfile profile)
    {
        var configJson = string.IsNullOrWhiteSpace(profile.ConfigurationJsonEncrypted) ? "{}" : profile.ConfigurationJsonEncrypted;
        using var doc = JsonDocument.Parse(configJson);
        var root = doc.RootElement;

        switch (profile.ProviderCode.ToUpperInvariant())
        {
            case "AWS_S3":
                var bucket = GetString(root, "BucketName", "dms-tenant-s3");
                var region = GetString(root, "Region", "us-east-1");
                var accessKey = GetString(root, "AccessKey");
                var secretKey = GetString(root, "SecretKey");
                var serviceUrl = GetString(root, "ServiceUrl");
                return new AwsS3StorageProvider(bucket, region, accessKey, secretKey, serviceUrl);

            case "AZURE_BLOB":
                var connStr = GetString(root, "ConnectionString");
                var container = GetString(root, "ContainerName", "dms-container");
                return new AzureBlobStorageProvider(connStr, container);

            case "GOOGLE_DRIVE":
                var folderId = GetString(root, "FolderId", "root");
                return new GoogleDriveStorageProvider(folderId);

            case "ONEDRIVE":
                var driveId = GetString(root, "DriveId", "default");
                return new OneDriveStorageProvider(driveId);

            case "SHAREPOINT":
                var siteUrl = GetString(root, "SiteUrl", "https://company.sharepoint.com/sites/dms");
                var lib = GetString(root, "DocumentLibrary", "Documents");
                return new SharePointStorageProvider(siteUrl, lib);

            case "LOCAL_AGENT":
                var agentUrl = GetString(root, "AgentUrl", "https://localhost:7099/agent");
                var token = GetString(root, "AuthToken", "agent-secret-token");
                var rootPath = GetString(root, "RootPath", "D:\\NAS_Storage");
                return new LocalStorageAgentProvider(agentUrl, token, rootPath);

            case "LOCAL":
            default:
                var basePath = GetString(root, "BasePath");
                if (string.IsNullOrWhiteSpace(basePath))
                {
                    basePath = Path.Combine(Directory.GetCurrentDirectory(), "Storage", $"Tenant_{profile.TenantId}");
                }
                return new LocalStorageProvider(basePath);
        }
    }

    private static string GetString(JsonElement root, string propertyName, string defaultValue = "")
    {
        if (root.TryGetProperty(propertyName, out var element) && element.ValueKind == JsonValueKind.String)
        {
            return element.GetString() ?? defaultValue;
        }
        return defaultValue;
    }
}
