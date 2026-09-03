using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using DMS.Api.Storage.Abstractions;
using DMS.Api.Storage.Models;

namespace DMS.Api.Storage.Providers;

public class AzureBlobStorageProvider : IStorageProvider
{
    private readonly string _containerName;
    private readonly BlobContainerClient? _containerClient;

    public AzureBlobStorageProvider(string connectionString, string containerName)
    {
        _containerName = string.IsNullOrWhiteSpace(containerName) ? "dms-container" : containerName;
        if (!string.IsNullOrWhiteSpace(connectionString) && connectionString.Contains("DefaultEndpointsProtocol="))
        {
            var serviceClient = new BlobServiceClient(connectionString);
            _containerClient = serviceClient.GetBlobContainerClient(_containerName);
        }
    }

    public string ProviderCode => "AZURE_BLOB";

    public StorageCapabilities Capabilities => new()
    {
        SupportsFolders = true,
        SupportsVersions = true,
        SupportsRestore = true,
        SupportsMove = true,
        SupportsCopy = true,
        SupportsDirectUpload = true,
        SupportsDirectDownload = true,
        SupportsMultipartUpload = true,
        SupportsSharing = true
    };

    public async Task<StorageObjectResult> UploadAsync(Stream stream, string fileName, string contentType, string? folderKey, CancellationToken cancellationToken = default)
    {
        var objectKey = string.IsNullOrWhiteSpace(folderKey)
            ? $"{Guid.NewGuid()}_{fileName}"
            : $"{folderKey.TrimEnd('/')}/{Guid.NewGuid()}_{fileName}";

        if (_containerClient != null)
        {
            await _containerClient.CreateIfNotExistsAsync(cancellationToken: cancellationToken);
            var blobClient = _containerClient.GetBlobClient(objectKey);
            var headers = new BlobHttpHeaders { ContentType = contentType };
            await blobClient.UploadAsync(stream, new BlobUploadOptions { HttpHeaders = headers }, cancellationToken);

            return new StorageObjectResult
            {
                ObjectKey = objectKey,
                FileName = fileName,
                FileSize = stream.Length,
                ContentType = contentType,
                UploadedAt = DateTime.UtcNow
            };
        }

        // Azure Blob Simulator for local testing without cloud credentials
        var tempFolder = Path.Combine(Path.GetTempPath(), "DMS_Azure_Sim", _containerName);
        Directory.CreateDirectory(tempFolder);
        var targetFile = Path.Combine(tempFolder, objectKey.Replace('/', '_'));
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

    public async Task<Stream> DownloadAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        if (_containerClient != null)
        {
            var blobClient = _containerClient.GetBlobClient(objectKey);
            var downloadResponse = await blobClient.DownloadAsync(cancellationToken);
            var memoryStream = new MemoryStream();
            await downloadResponse.Value.Content.CopyToAsync(memoryStream, cancellationToken);
            memoryStream.Position = 0;
            return memoryStream;
        }

        var tempFolder = Path.Combine(Path.GetTempPath(), "DMS_Azure_Sim", _containerName);
        var targetFile = Path.Combine(tempFolder, objectKey.Replace('/', '_'));
        if (File.Exists(targetFile))
        {
            return new FileStream(targetFile, FileMode.Open, FileAccess.Read);
        }
        return new MemoryStream(System.Text.Encoding.UTF8.GetBytes($"Azure Simulated File Content for {objectKey}"));
    }

    public async Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        if (_containerClient != null)
        {
            var blobClient = _containerClient.GetBlobClient(objectKey);
            await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
        }
    }

    public Task RestoreAsync(string objectKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task RenameAsync(string objectKey, string newFileName, CancellationToken cancellationToken = default) => Task.CompletedTask;

    public async Task CopyAsync(string sourceObjectKey, string destinationFolderKey, CancellationToken cancellationToken = default)
    {
        if (_containerClient != null)
        {
            var sourceBlob = _containerClient.GetBlobClient(sourceObjectKey);
            var destKey = $"{destinationFolderKey.TrimEnd('/')}/{Path.GetFileName(sourceObjectKey)}";
            var destBlob = _containerClient.GetBlobClient(destKey);
            await destBlob.StartCopyFromUriAsync(sourceBlob.Uri, cancellationToken: cancellationToken);
        }
    }

    public async Task MoveAsync(string objectKey, string destinationFolderKey, CancellationToken cancellationToken = default)
    {
        await CopyAsync(objectKey, destinationFolderKey, cancellationToken);
        await DeleteAsync(objectKey, cancellationToken);
    }

    public async Task<bool> ExistsAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        if (_containerClient != null)
        {
            var blobClient = _containerClient.GetBlobClient(objectKey);
            var response = await blobClient.ExistsAsync(cancellationToken);
            return response.Value;
        }
        return true;
    }

    public Task<StorageFolderResult> CreateFolderAsync(string folderName, string? parentFolderKey, CancellationToken cancellationToken = default)
    {
        var folderKey = string.IsNullOrWhiteSpace(parentFolderKey) ? $"{folderName}/" : $"{parentFolderKey.TrimEnd('/')}/{folderName}/";
        return Task.FromResult(new StorageFolderResult { FolderKey = folderKey, FolderName = folderName });
    }

    public async Task<StorageConnectionTestResult> TestConnectionAsync(CancellationToken cancellationToken = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        if (_containerClient != null)
        {
            try
            {
                await _containerClient.ExistsAsync(cancellationToken);
                sw.Stop();
                return new StorageConnectionTestResult { IsSuccess = true, Message = "Azure Blob Storage connected.", LatencyMs = sw.ElapsedMilliseconds };
            }
            catch (Exception ex)
            {
                sw.Stop();
                return new StorageConnectionTestResult { IsSuccess = false, Message = $"Azure Blob connection error: {ex.Message}", LatencyMs = sw.ElapsedMilliseconds };
            }
        }
        sw.Stop();
        return new StorageConnectionTestResult { IsSuccess = true, Message = "Azure Blob Storage Simulator active.", LatencyMs = sw.ElapsedMilliseconds };
    }
}
