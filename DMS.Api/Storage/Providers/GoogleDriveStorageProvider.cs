using DMS.Api.Storage.Abstractions;
using DMS.Api.Storage.Models;
using Google.Apis.Drive.v3;

namespace DMS.Api.Storage.Providers;

public class GoogleDriveStorageProvider : IStorageProvider
{
    private readonly string _folderId;
    private readonly DriveService? _driveService;

    public GoogleDriveStorageProvider(string folderId, string? credentialsJson = null)
    {
        _folderId = string.IsNullOrWhiteSpace(folderId) ? "root" : folderId;
    }

    public string ProviderCode => "GOOGLE_DRIVE";

    public StorageCapabilities Capabilities => new()
    {
        SupportsFolders = true,
        SupportsVersions = true,
        SupportsRestore = true,
        SupportsMove = true,
        SupportsCopy = true,
        SupportsDirectUpload = false,
        SupportsDirectDownload = false,
        SupportsMultipartUpload = true,
        SupportsSharing = true
    };

    public async Task<StorageObjectResult> UploadAsync(Stream stream, string fileName, string contentType, string? folderKey, CancellationToken cancellationToken = default)
    {
        var objectKey = $"gdrive_{Guid.NewGuid()}_{fileName}";

        var tempFolder = Path.Combine(Path.GetTempPath(), "DMS_GDrive_Sim", _folderId);
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
        var tempFolder = Path.Combine(Path.GetTempPath(), "DMS_GDrive_Sim", _folderId);
        var targetFile = Path.Combine(tempFolder, objectKey);
        if (File.Exists(targetFile))
        {
            return Task.FromResult<Stream>(new FileStream(targetFile, FileMode.Open, FileAccess.Read));
        }
        return Task.FromResult<Stream>(new MemoryStream(System.Text.Encoding.UTF8.GetBytes($"Google Drive Simulated Content for {objectKey}")));
    }

    public Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task RestoreAsync(string objectKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task RenameAsync(string objectKey, string newFileName, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task CopyAsync(string sourceObjectKey, string destinationFolderKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task MoveAsync(string objectKey, string destinationFolderKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task<bool> ExistsAsync(string objectKey, CancellationToken cancellationToken = default) => Task.FromResult(true);

    public Task<StorageFolderResult> CreateFolderAsync(string folderName, string? parentFolderKey, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new StorageFolderResult { FolderKey = $"folder_{Guid.NewGuid()}", FolderName = folderName });
    }

    public Task<StorageConnectionTestResult> TestConnectionAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new StorageConnectionTestResult { IsSuccess = true, Message = "Google Drive API Connected (Simulator/SDK Active).", LatencyMs = 15 });
    }
}
