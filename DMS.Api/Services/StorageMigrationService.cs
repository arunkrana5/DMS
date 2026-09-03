using DMS.Api.Authorization;
using DMS.Api.Data;
using DMS.Api.Entities;
using DMS.Api.Storage.Factory;
using Microsoft.EntityFrameworkCore;

namespace DMS.Api.Services;

public interface IStorageMigrationService
{
    Task<StorageMigrationJob> CreateMigrationJobAsync(int documentId, int targetProfileId, bool removeSource = false, CancellationToken cancellationToken = default);
    Task ExecuteMigrationAsync(int jobId, CancellationToken cancellationToken = default);
}

public class StorageMigrationService : IStorageMigrationService
{
    private readonly DmsDbContext _dbContext;
    private readonly IStorageProviderFactory _storageFactory;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditLogger _auditLogger;
    private readonly IWebhookDispatcher _webhookDispatcher;

    public StorageMigrationService(
        DmsDbContext dbContext,
        IStorageProviderFactory storageFactory,
        ITenantContext tenantContext,
        IAuditLogger auditLogger,
        IWebhookDispatcher webhookDispatcher)
    {
        _dbContext = dbContext;
        _storageFactory = storageFactory;
        _tenantContext = tenantContext;
        _auditLogger = auditLogger;
        _webhookDispatcher = webhookDispatcher;
    }

    public async Task<StorageMigrationJob> CreateMigrationJobAsync(int documentId, int targetProfileId, bool removeSource = false, CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var doc = await _dbContext.Documents.FirstOrDefaultAsync(d => d.TenantId == tenantId && d.Id == documentId, cancellationToken);
        if (doc == null) throw new KeyNotFoundException("Document not found.");

        var job = new StorageMigrationJob
        {
            TenantId = tenantId,
            DocumentId = documentId,
            SourceStorageProfileId = doc.StorageProfileId,
            DestinationStorageProfileId = targetProfileId,
            Status = "Pending",
            ProgressPercentage = 0,
            RemoveSourceOnSuccess = removeSource,
            CreatedBy = _tenantContext.UserId > 0 ? _tenantContext.UserId : 1,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.StorageMigrationJobs.Add(job);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return job;
    }

    public async Task ExecuteMigrationAsync(int jobId, CancellationToken cancellationToken = default)
    {
        var job = await _dbContext.StorageMigrationJobs
            .Include(j => j.Document)
            .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);

        if (job == null || job.Document == null) return;

        try
        {
            job.Status = "InProgress";
            job.ProgressPercentage = 10;
            await _dbContext.SaveChangesAsync(cancellationToken);

            var sourceProfile = await _dbContext.StorageProfiles.FindAsync(new object[] { job.SourceStorageProfileId }, cancellationToken);
            var destProfile = await _dbContext.StorageProfiles.FindAsync(new object[] { job.DestinationStorageProfileId }, cancellationToken);

            if (sourceProfile == null || destProfile == null)
            {
                throw new InvalidOperationException("Invalid source or destination storage profile.");
            }

            var sourceProvider = await _storageFactory.GetProviderAsync(sourceProfile, cancellationToken);
            var destProvider = await _storageFactory.GetProviderAsync(destProfile, cancellationToken);

            // Step 1: Read source object stream
            await using var sourceStream = await sourceProvider.DownloadAsync(job.Document.StorageObjectKey, cancellationToken);
            job.ProgressPercentage = 40;
            await _dbContext.SaveChangesAsync(cancellationToken);

            // Step 2: Upload to destination
            var uploadResult = await destProvider.UploadAsync(sourceStream, job.Document.FileName, job.Document.ContentType, null, cancellationToken);
            job.ProgressPercentage = 70;
            await _dbContext.SaveChangesAsync(cancellationToken);

            // Step 3: Verify destination existence
            var exists = await destProvider.ExistsAsync(uploadResult.ObjectKey, cancellationToken);
            if (!exists)
            {
                throw new InvalidOperationException("Destination verification failed. Object missing after upload.");
            }

            // Step 4: Update document metadata
            var oldObjectKey = job.Document.StorageObjectKey;
            job.Document.StorageProfileId = destProfile.Id;
            job.Document.StorageObjectKey = uploadResult.ObjectKey;
            job.Document.ModifiedDate = DateTime.UtcNow;

            // Step 5: Remove source if configured
            if (job.RemoveSourceOnSuccess)
            {
                await sourceProvider.DeleteAsync(oldObjectKey, cancellationToken);
            }

            job.Status = "Completed";
            job.ProgressPercentage = 100;
            await _dbContext.SaveChangesAsync(cancellationToken);

            await _auditLogger.LogAsync(job.TenantId, job.Document.ApplicationId, 1, job.DocumentId, "STORAGE_MIGRATION", "SystemJob", destProfile.ProviderCode, $"Migrated document from {sourceProfile.Name} to {destProfile.Name}");
            await _webhookDispatcher.DispatchAsync(job.TenantId, job.Document.ApplicationId, "StorageMigrationCompleted", new { JobId = job.Id, DocumentPublicId = job.Document.PublicId });
        }
        catch (Exception ex)
        {
            job.Status = "Failed";
            job.ErrorMessage = ex.Message;
            await _dbContext.SaveChangesAsync(cancellationToken);
            await _webhookDispatcher.DispatchAsync(job.TenantId, job.Document?.ApplicationId, "StorageMigrationFailed", new { JobId = job.Id, Error = ex.Message });
        }
    }
}
