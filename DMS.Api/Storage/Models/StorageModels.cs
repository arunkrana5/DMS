namespace DMS.Api.Storage.Models;

public sealed class StorageCapabilities
{
    public bool SupportsFolders { get; init; } = true;
    public bool SupportsVersions { get; init; } = true;
    public bool SupportsRestore { get; init; } = true;
    public bool SupportsMove { get; init; } = true;
    public bool SupportsCopy { get; init; } = true;
    public bool SupportsDirectUpload { get; init; } = false;
    public bool SupportsDirectDownload { get; init; } = false;
    public bool SupportsMultipartUpload { get; init; } = false;
    public bool SupportsSharing { get; init; } = false;
}

public class StorageObjectResult
{
    public string ObjectKey { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string? ETag { get; set; }
    public string? DirectUploadUrl { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

public class StorageFolderResult
{
    public string FolderKey { get; set; } = string.Empty;
    public string FolderName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class StorageConnectionTestResult
{
    public bool IsSuccess { get; set; }
    public string Message { get; set; } = string.Empty;
    public long LatencyMs { get; set; }
    public DateTime TestedAt { get; set; } = DateTime.UtcNow;
}
