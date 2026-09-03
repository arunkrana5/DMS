using DMS.Api.Storage.Models;

namespace DMS.Api.Storage.Abstractions;

public interface IStorageProvider
{
    string ProviderCode { get; }
    StorageCapabilities Capabilities { get; }

    Task<StorageObjectResult> UploadAsync(
        Stream stream,
        string fileName,
        string contentType,
        string? folderKey,
        CancellationToken cancellationToken = default);

    Task<Stream> DownloadAsync(
        string objectKey,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(
        string objectKey,
        CancellationToken cancellationToken = default);

    Task RestoreAsync(
        string objectKey,
        CancellationToken cancellationToken = default);

    Task RenameAsync(
        string objectKey,
        string newFileName,
        CancellationToken cancellationToken = default);

    Task CopyAsync(
        string sourceObjectKey,
        string destinationFolderKey,
        CancellationToken cancellationToken = default);

    Task MoveAsync(
        string objectKey,
        string destinationFolderKey,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsAsync(
        string objectKey,
        CancellationToken cancellationToken = default);

    Task<StorageFolderResult> CreateFolderAsync(
        string folderName,
        string? parentFolderKey,
        CancellationToken cancellationToken = default);

    Task<StorageConnectionTestResult> TestConnectionAsync(
        CancellationToken cancellationToken = default);
}
