using DMS.Api.Entities;
using DMS.Api.Storage.Abstractions;

namespace DMS.Api.Storage.Factory;

public interface IStorageProviderFactory
{
    Task<IStorageProvider> GetProviderAsync(StorageProfile profile, CancellationToken cancellationToken = default);
    Task<IStorageProvider> GetDefaultProviderAsync(int tenantId, CancellationToken cancellationToken = default);
}
