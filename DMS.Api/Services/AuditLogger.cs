using System.Threading.Channels;
using DMS.Api.Data;
using DMS.Api.Entities;

namespace DMS.Api.Services;

public interface IAuditLogger
{
    ValueTask LogAsync(int tenantId, int? applicationId, int userId, int? documentId, string action, string userAgent, string? storageProvider, string? remarks);
}

public class AuditLogger : IAuditLogger
{
    private readonly Channel<AuditLog> _channel;

    public AuditLogger()
    {
        var options = new BoundedChannelOptions(10000)
        {
            SingleReader = true,
            FullMode = BoundedChannelFullMode.Wait
        };
        _channel = Channel.CreateBounded<AuditLog>(options);
    }

    public ChannelReader<AuditLog> Reader => _channel.Reader;

    public ValueTask LogAsync(int tenantId, int? applicationId, int userId, int? documentId, string action, string userAgent, string? storageProvider, string? remarks)
    {
        var audit = new AuditLog
        {
            TenantId = tenantId,
            ApplicationId = applicationId,
            UserId = userId,
            DocumentId = documentId,
            Action = action,
            UserAgent = userAgent,
            StorageProvider = storageProvider,
            Remarks = remarks,
            CreatedDate = DateTime.UtcNow
        };

        return _channel.Writer.WriteAsync(audit);
    }
}
