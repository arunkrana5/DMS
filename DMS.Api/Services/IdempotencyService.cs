using System.Security.Cryptography;
using System.Text;
using DMS.Api.Data;
using DMS.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DMS.Api.Services;

public interface IIdempotencyService
{
    Task<Document?> CheckDuplicateAsync(int tenantId, string idempotencyKey, string requestHash, CancellationToken cancellationToken = default);
    Task RegisterKeyAsync(int tenantId, int? applicationId, string idempotencyKey, string requestHash, int documentId, CancellationToken cancellationToken = default);
    string ComputeHash(string content);
}

public class IdempotencyService : IIdempotencyService
{
    private readonly DmsDbContext _dbContext;

    public IdempotencyService(DmsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Document?> CheckDuplicateAsync(int tenantId, string idempotencyKey, string requestHash, CancellationToken cancellationToken = default)
    {
        var existingKey = await _dbContext.IdempotencyKeys
            .AsNoTracking()
            .FirstOrDefaultAsync(k => k.TenantId == tenantId && k.Key == idempotencyKey, cancellationToken);

        if (existingKey == null) return null;

        if (existingKey.RequestHash != requestHash)
        {
            throw new InvalidOperationException("Idempotency key collision detected with different request payload.");
        }

        return await _dbContext.Documents
            .Include(d => d.StorageProfile)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == existingKey.DocumentId, cancellationToken);
    }

    public async Task RegisterKeyAsync(int tenantId, int? applicationId, string idempotencyKey, string requestHash, int documentId, CancellationToken cancellationToken = default)
    {
        var key = new IdempotencyKey
        {
            TenantId = tenantId,
            ApplicationId = applicationId,
            Key = idempotencyKey,
            RequestHash = requestHash,
            DocumentId = documentId,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.IdempotencyKeys.Add(key);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public string ComputeHash(string content)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(content));
        return Convert.ToHexString(bytes);
    }
}
