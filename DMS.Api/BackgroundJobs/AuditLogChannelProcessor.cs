using DMS.Api.Data;
using DMS.Api.Entities;
using DMS.Api.Services;

namespace DMS.Api.BackgroundJobs;

public class AuditLogChannelProcessor : BackgroundService
{
    private readonly AuditLogger _auditLogger;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<AuditLogChannelProcessor> _logger;

    public AuditLogChannelProcessor(IAuditLogger auditLogger, IServiceProvider serviceProvider, ILogger<AuditLogChannelProcessor> logger)
    {
        _auditLogger = (AuditLogger)auditLogger;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Audit Log Channel Processor started.");

        while (await _auditLogger.Reader.WaitToReadAsync(stoppingToken))
        {
            var logs = new List<AuditLog>();
            while (_auditLogger.Reader.TryRead(out var item))
            {
                logs.Add(item);
                if (logs.Count >= 100) break;
            }

            if (logs.Count > 0)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<DmsDbContext>();
                    db.AuditLogs.AddRange(logs);
                    await db.SaveChangesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error persisting batch audit logs.");
                }
            }
        }
    }
}
