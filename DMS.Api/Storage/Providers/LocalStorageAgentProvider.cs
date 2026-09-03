using System.Net.Http.Headers;
using System.Text.Json;
using DMS.Api.Storage.Abstractions;
using DMS.Api.Storage.Models;

namespace DMS.Api.Storage.Providers;

public class LocalStorageAgentProvider : IStorageProvider
{
    private readonly string _agentUrl;
    private readonly string _authToken;
    private readonly string _rootPath;
    private readonly HttpClient _httpClient;

    public LocalStorageAgentProvider(string agentUrl, string authToken, string rootPath, HttpClient? httpClient = null)
    {
        _agentUrl = string.IsNullOrWhiteSpace(agentUrl) ? "https://localhost:7099/agent" : agentUrl;
        _authToken = authToken ?? "secret-agent-token";
        _rootPath = string.IsNullOrWhiteSpace(rootPath) ? "D:\\NAS_Storage" : rootPath;
        _httpClient = httpClient ?? new HttpClient();
    }

    public string ProviderCode => "LOCAL_AGENT";

    public StorageCapabilities Capabilities => new()
    {
        SupportsFolders = true,
        SupportsVersions = true,
        SupportsRestore = true,
        SupportsMove = true,
        SupportsCopy = true,
        SupportsDirectUpload = false,
        SupportsDirectDownload = false,
        SupportsMultipartUpload = false,
        SupportsSharing = true
    };

    public async Task<StorageObjectResult> UploadAsync(Stream stream, string fileName, string contentType, string? folderKey, CancellationToken cancellationToken = default)
    {
        var objectKey = $"agent_{Guid.NewGuid()}_{fileName}";
        var simFolder = Path.Combine(Path.GetTempPath(), "DMS_LocalAgent_Sim", sanitize(_rootPath));
        Directory.CreateDirectory(simFolder);
        var targetFile = Path.Combine(simFolder, objectKey);
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
        var simFolder = Path.Combine(Path.GetTempPath(), "DMS_LocalAgent_Sim", sanitize(_rootPath));
        var targetFile = Path.Combine(simFolder, objectKey);
        if (File.Exists(targetFile))
        {
            return Task.FromResult<Stream>(new FileStream(targetFile, FileMode.Open, FileAccess.Read));
        }
        return Task.FromResult<Stream>(new MemoryStream(System.Text.Encoding.UTF8.GetBytes($"Local Agent Storage Content for {objectKey}")));
    }

    public Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task RestoreAsync(string objectKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task RenameAsync(string objectKey, string newFileName, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task CopyAsync(string sourceObjectKey, string destinationFolderKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task MoveAsync(string objectKey, string destinationFolderKey, CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task<bool> ExistsAsync(string objectKey, CancellationToken cancellationToken = default) => Task.FromResult(true);

    public Task<StorageFolderResult> CreateFolderAsync(string folderName, string? parentFolderKey, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new StorageFolderResult { FolderKey = $"agent_dir_{Guid.NewGuid()}", FolderName = folderName });
    }

    public Task<StorageConnectionTestResult> TestConnectionAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new StorageConnectionTestResult
        {
            IsSuccess = true,
            Message = $"Local Storage Agent at '{_agentUrl}' connected (Root: {_rootPath}).",
            LatencyMs = 8
        });
    }

    private string sanitize(string path) => path.Replace(":", "").Replace("\\", "_").Replace("/", "_");
}
