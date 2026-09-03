using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DMS.Api.Data;
using DMS.Api.Entities;
using DMS.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace DMS.Api.BackgroundJobs;

public class WebhookDeliveryBackgroundService : BackgroundService
{
    private readonly WebhookDispatcher _dispatcher;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WebhookDeliveryBackgroundService> _logger;

    public WebhookDeliveryBackgroundService(
        IWebhookDispatcher dispatcher,
        IServiceProvider serviceProvider,
        ILogger<WebhookDeliveryBackgroundService> logger)
    {
        _dispatcher = (WebhookDispatcher)dispatcher;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Webhook Delivery Background Service started.");

        while (await _dispatcher.Reader.WaitToReadAsync(stoppingToken))
        {
            if (_dispatcher.Reader.TryRead(out var msg))
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<DmsDbContext>();

                    var webhooks = await db.Webhooks
                        .AsNoTracking()
                        .Where(w => w.EventType == msg.EventType && w.IsActive)
                        .ToListAsync(stoppingToken);

                    foreach (var hook in webhooks)
                    {
                        await DeliverWebhookAsync(db, hook, msg, stoppingToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing webhook delivery for Event {EventType}", msg.EventType);
                }
            }
        }
    }

    private async Task DeliverWebhookAsync(DmsDbContext db, Webhook hook, WebhookMessage msg, CancellationToken cancellationToken)
    {
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        var jsonPayload = JsonSerializer.Serialize(new
        {
            eventType = msg.EventType,
            tenantId = msg.TenantId,
            applicationId = msg.ApplicationId,
            data = msg.Payload,
            timestamp = DateTime.UtcNow
        });

        var request = new HttpRequestMessage(HttpMethod.Post, hook.Endpoint);
        request.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

        if (!string.IsNullOrWhiteSpace(hook.SecretReference))
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(hook.SecretReference));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(jsonPayload));
            var signature = Convert.ToHexString(hash).ToLowerInvariant();
            request.Headers.Add("X-DMS-Signature", signature);
        }

        request.Headers.Add("X-DMS-Event", msg.EventType);

        var delivery = new WebhookDelivery
        {
            WebhookId = hook.Id,
            EventType = msg.EventType,
            PayloadJson = jsonPayload,
            AttemptCount = 1,
            CreatedDate = DateTime.UtcNow
        };

        try
        {
            var response = await client.SendAsync(request, cancellationToken);
            delivery.ResponseStatusCode = (int)response.StatusCode;
            delivery.IsSuccess = response.IsSuccessStatusCode;
            delivery.ResponseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogInformation("Successfully sent webhook to {Endpoint} with Status {Status}", hook.Endpoint, response.StatusCode);
        }
        catch (Exception ex)
        {
            delivery.ResponseStatusCode = 500;
            delivery.IsSuccess = false;
            delivery.ResponseBody = ex.Message;
            _logger.LogWarning(ex, "Failed to send webhook to {Endpoint}", hook.Endpoint);
        }

        db.WebhookDeliveries.Add(delivery);
        await db.SaveChangesAsync(cancellationToken);
    }
}

public class StorageMigrationBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<StorageMigrationBackgroundService> _logger;

    public StorageMigrationBackgroundService(IServiceProvider serviceProvider, ILogger<StorageMigrationBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Storage Migration Background Service running.");

        while (!stoppingToken.IsCancellationRequested)
        {
            int pollInterval = 5;
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<DmsDbContext>();
                var migrationService = scope.ServiceProvider.GetRequiredService<IStorageMigrationService>();
                var configService = scope.ServiceProvider.GetRequiredService<IConfigSettingsService>();

                pollInterval = await configService.GetSettingAsync<int>("Background.MigrationPollIntervalSeconds", defaultValue: 5, cancellationToken: stoppingToken);
                if (pollInterval <= 0) pollInterval = 5;

                var pendingJob = await db.StorageMigrationJobs
                    .FirstOrDefaultAsync(j => j.Status == "Pending", stoppingToken);

                if (pendingJob != null)
                {
                    await migrationService.ExecuteMigrationAsync(pendingJob.Id, stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing pending storage migration job.");
            }

            await Task.Delay(TimeSpan.FromSeconds(pollInterval), stoppingToken);
        }
    }
}
