using DMS.Api.Storage.Abstractions;
using DMS.Api.Storage.Models;

namespace DMS.Api.Storage.Providers;

public class LocalStorageProvider : IStorageProvider
{
    private readonly string _baseDirectory;

    public LocalStorageProvider(string baseDirectory)
    {
        _baseDirectory = string.IsNullOrWhiteSpace(baseDirectory)
            ? Path.Combine(Directory.GetCurrentDirectory(), "Storage")
            : baseDirectory;

        if (!Directory.Exists(_baseDirectory))
        {
            Directory.CreateDirectory(_baseDirectory);
        }
    }

    public string ProviderCode => "LOCAL";

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
        var targetFolder = string.IsNullOrWhiteSpace(folderKey) ? _baseDirectory : GetSafePath(folderKey);
        if (!Directory.Exists(targetFolder))
        {
            Directory.CreateDirectory(targetFolder);
        }

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var guidPhysicalFileName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(targetFolder, guidPhysicalFileName);
        var relativeObjectKey = Path.GetRelativePath(_baseDirectory, fullPath).Replace("\\", "/");

        await using (var fileStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        {
            await stream.CopyToAsync(fileStream, cancellationToken);
        }

        var fileInfo = new FileInfo(fullPath);

        return new StorageObjectResult
        {
            ObjectKey = relativeObjectKey,
            FileName = fileName,
            FileSize = fileInfo.Length,
            ContentType = contentType,
            UploadedAt = DateTime.UtcNow
        };
    }

    public Task<Stream> DownloadAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        var fullPath = GetSafePath(objectKey);
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"Storage object '{objectKey}' not found.");
        }

        Stream stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true);
        return Task.FromResult(stream);
    }

    public Task DeleteAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        var fullPath = GetSafePath(objectKey);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
        return Task.CompletedTask;
    }

    public Task RestoreAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        var fullPath = GetSafePath(objectKey);
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"Cannot restore object '{objectKey}'. Physical file missing.");
        }
        return Task.CompletedTask;
    }

    public Task RenameAsync(string objectKey, string newFileName, CancellationToken cancellationToken = default)
    {
        var fullPath = GetSafePath(objectKey);
        if (File.Exists(fullPath))
        {
            var directory = Path.GetDirectoryName(fullPath)!;
            var ext = Path.GetExtension(newFileName).ToLowerInvariant();
            var newFullPath = Path.Combine(directory, $"{Guid.NewGuid()}{ext}");
            File.Move(fullPath, newFullPath);
        }
        return Task.CompletedTask;
    }

    public Task CopyAsync(string sourceObjectKey, string destinationFolderKey, CancellationToken cancellationToken = default)
    {
        var sourcePath = GetSafePath(sourceObjectKey);
        var destFolder = string.IsNullOrWhiteSpace(destinationFolderKey) ? _baseDirectory : GetSafePath(destinationFolderKey);
        if (File.Exists(sourcePath))
        {
            var ext = Path.GetExtension(sourcePath).ToLowerInvariant();
            var destPath = Path.Combine(destFolder, $"{Guid.NewGuid()}{ext}");
            File.Copy(sourcePath, destPath, overwrite: true);
        }
        return Task.CompletedTask;
    }

    public Task MoveAsync(string objectKey, string destinationFolderKey, CancellationToken cancellationToken = default)
    {
        var sourcePath = GetSafePath(objectKey);
        var destFolder = string.IsNullOrWhiteSpace(destinationFolderKey) ? _baseDirectory : GetSafePath(destinationFolderKey);
        if (File.Exists(sourcePath))
        {
            var ext = Path.GetExtension(sourcePath).ToLowerInvariant();
            var destPath = Path.Combine(destFolder, $"{Guid.NewGuid()}{ext}");
            File.Move(sourcePath, destPath, overwrite: true);
        }
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        var fullPath = GetSafePath(objectKey);
        return Task.FromResult(File.Exists(fullPath));
    }

    public Task<StorageFolderResult> CreateFolderAsync(string folderName, string? parentFolderKey, CancellationToken cancellationToken = default)
    {
        var parentFolder = string.IsNullOrWhiteSpace(parentFolderKey) ? _baseDirectory : GetSafePath(parentFolderKey);
        var newFolder = Path.Combine(parentFolder, folderName);
        if (!Directory.Exists(newFolder))
        {
            Directory.CreateDirectory(newFolder);
        }

        var relativeFolderKey = Path.GetRelativePath(_baseDirectory, newFolder).Replace("\\", "/");
        return Task.FromResult(new StorageFolderResult
        {
            FolderKey = relativeFolderKey,
            FolderName = folderName,
            CreatedAt = DateTime.UtcNow
        });
    }

    public Task<StorageConnectionTestResult> TestConnectionAsync(CancellationToken cancellationToken = default)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var exists = Directory.Exists(_baseDirectory);
        sw.Stop();

        return Task.FromResult(new StorageConnectionTestResult
        {
            IsSuccess = exists,
            Message = exists ? "Local storage directory accessible." : "Local storage directory missing.",
            LatencyMs = sw.ElapsedMilliseconds
        });
    }

    private string GetSafePath(string relativePath)
    {
        var combined = Path.Combine(_baseDirectory, relativePath.Replace("/", "\\"));
        var fullPath = Path.GetFullPath(combined);
        if (!fullPath.StartsWith(Path.GetFullPath(_baseDirectory), StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Path traversal detected.");
        }
        return fullPath;
    }
}
