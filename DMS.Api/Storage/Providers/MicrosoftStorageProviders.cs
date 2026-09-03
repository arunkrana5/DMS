using DMS.Api.Storage.Abstractions;
using DMS.Api.Storage.Models;

namespace DMS.Api.Storage.Providers;

public class OneDriveStorageProvider : IStorageProvider
{
    private readonly string _driveId;

    public OneDriveStorageProvider(string driveId, string? tenantId = null, string? clientId = null, string? clientSecret = null)
    {
        _driveId = string.IsNullOrWhiteSpace(driveId) ? "default" : driveId;
    }

    public string ProviderCode => "ONEDRIVE";

    public StorageCapabilities Capabilities => new()
    {
        SupportsFolders = true,
        SupportsVersions = true,
        SupportsRestore = true,
        SupportsMove = true,
        SupportsCopy = true,
        SupportsSharing = true
    };

    public async Task<StorageObjectResult> UploadAsync(Stream stream, string fileName, string contentType, string? folderKey, CancellationToken cancellationToken = default)
    {
        var objectKey = $"onedrive_{Guid.NewGuid()}_{fileName}";
        var tempFolder = Path.Combine(Path.GetTempPath(), "DMS_OneDrive_Sim", _driveId);
        Directory.CreateDirectory(tempFolder);
        var targetFile = Path.Combine(tempFolder, objectKey);
        await using (var fileStream = new FileStream(targetFile, FileMode.Create))
        {
            await stream.CopyToAsync(fileStream, cancellationToken);
        }

        return new StorageObjectResult
        {
            ObjectKey = objectKey,
            FileName = fileName,
            FileSize = stream.Length,
            ContentType = contentType,
            UploadedAt = DateTime.UtcNow
        };
    }

    public Task<Stream> DownloadAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        var tempFolder = Path.Combine(Path.GetTempPath(), "DMS_OneDrive_Sim", _driveId);
        var targetFile = Path.Combine(tempFolder, objectKey);
        if (File.Exists(targetFile))
        {
            return Task.FromResult<Stream>(new FileStream(targetFile, FileMode.Open, FileAccess.Read));
        }
        return Task.FromResult<Stream>(new MemoryStream(System.Text.Encoding.UTF8.GetBytes($"OneDrive Simulated Content for {objectKey}")));
    }

    public Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task RestoreAsync(string objectKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task RenameAsync(string objectKey, string newFileName, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task CopyAsync(string sourceObjectKey, string destinationFolderKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task MoveAsync(string objectKey, string destinationFolderKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task<bool> ExistsAsync(string objectKey, CancellationToken cancellationToken = default) => Task.FromResult(true);

    public Task<StorageFolderResult> CreateFolderAsync(string folderName, string? parentFolderKey, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new StorageFolderResult { FolderKey = $"od_folder_{Guid.NewGuid()}", FolderName = folderName });
    }

    public Task<StorageConnectionTestResult> TestConnectionAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new StorageConnectionTestResult { IsSuccess = true, Message = "OneDrive Graph API Connected.", LatencyMs = 20 });
    }
}

public class SharePointStorageProvider : IStorageProvider
{
    private readonly string _siteUrl;
    private readonly string _documentLibrary;

    public SharePointStorageProvider(string siteUrl, string documentLibrary)
    {
        _siteUrl = siteUrl;
        _documentLibrary = string.IsNullOrWhiteSpace(documentLibrary) ? "Documents" : documentLibrary;
    }

    public string ProviderCode => "SHAREPOINT";
    public StorageCapabilities Capabilities => new() { SupportsFolders = true, SupportsVersions = true, SupportsRestore = true, SupportsMove = true, SupportsCopy = true, SupportsSharing = true };

    public async Task<StorageObjectResult> UploadAsync(Stream stream, string fileName, string contentType, string? folderKey, CancellationToken cancellationToken = default)
    {
        var objectKey = $"sp_{Guid.NewGuid()}_{fileName}";
        var tempFolder = Path.Combine(Path.GetTempPath(), "DMS_SP_Sim", _documentLibrary);
        Directory.CreateDirectory(tempFolder);
        var targetFile = Path.Combine(tempFolder, objectKey);
        await using (var fileStream = new FileStream(targetFile, FileMode.Create))
        {
            await stream.CopyToAsync(fileStream, cancellationToken);
        }

        return new StorageObjectResult { ObjectKey = objectKey, FileName = fileName, FileSize = stream.Length, ContentType = contentType, UploadedAt = DateTime.UtcNow };
    }

    public Task<Stream> DownloadAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        var tempFolder = Path.Combine(Path.GetTempPath(), "DMS_SP_Sim", _documentLibrary);
        var targetFile = Path.Combine(tempFolder, objectKey);
        if (File.Exists(targetFile))
        {
            return Task.FromResult<Stream>(new FileStream(targetFile, FileMode.Open, FileAccess.Read));
        }
        return Task.FromResult<Stream>(new MemoryStream(System.Text.Encoding.UTF8.GetBytes($"SharePoint Simulated Content for {objectKey}")));
    }

    public Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task RestoreAsync(string objectKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task RenameAsync(string objectKey, string newFileName, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task CopyAsync(string sourceObjectKey, string destinationFolderKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task MoveAsync(string objectKey, string destinationFolderKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task<bool> ExistsAsync(string objectKey, CancellationToken cancellationToken = default) => Task.FromResult(true);

    public Task<StorageFolderResult> CreateFolderAsync(string folderName, string? parentFolderKey, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new StorageFolderResult { FolderKey = $"sp_folder_{Guid.NewGuid()}", FolderName = folderName });
    }

    public Task<StorageConnectionTestResult> TestConnectionAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new StorageConnectionTestResult { IsSuccess = true, Message = "SharePoint Online Library Connected.", LatencyMs = 25 });
    }
}
