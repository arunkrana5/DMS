using System.Text;
using System.Text.Json;
using DMS.Api.Data;
using DMS.Api.Entities;

namespace DMS.Api.Services;

public interface IFirebaseNotificationService
{
    Task<bool> SendTopicNotificationAsync(int tenantId, string topic, string title, string body, object? dataPayload = null, CancellationToken cancellationToken = default);
    Task<bool> SendDeviceNotificationAsync(int tenantId, string deviceToken, string title, string body, object? dataPayload = null, CancellationToken cancellationToken = default);
}

public class FirebaseNotificationService : IFirebaseNotificationService
{
    private readonly IConfigSettingsService _configService;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<FirebaseNotificationService> _logger;
    private readonly HttpClient _httpClient;

    public FirebaseNotificationService(
        IConfigSettingsService configService,
        IServiceProvider serviceProvider,
        ILogger<FirebaseNotificationService> logger)
    {
        _configService = configService;
        _serviceProvider = serviceProvider;
        _logger = logger;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
    }

    public async Task<bool> SendTopicNotificationAsync(int tenantId, string topic, string title, string body, object? dataPayload = null, CancellationToken cancellationToken = default)
    {
        var enabled = await _configService.GetSettingAsync<bool>("Firebase.EnablePushNotifications", tenantId, null, true, cancellationToken);
        if (!enabled)
        {
            _logger.LogInformation("Firebase push notifications are disabled in ConfigSettings.");
            return false;
        }

        var serverKey = await _configService.GetSettingAsync<string>("Firebase.ServerKey", tenantId, null, "AAAA-MOCK-FIREBASE-SERVER-KEY-123456", cancellationToken);
        var fcmUrl = await _configService.GetSettingAsync<string>("Firebase.FcmEndpoint", tenantId, null, "https://fcm.googleapis.com/fcm/send", cancellationToken);

        var payload = new
        {
            to = $"/topics/{topic}",
            notification = new
            {
                title = title,
                body = body,
                sound = "default",
                icon = "ic_notification"
            },
            data = dataPayload ?? new { }
        };

        var isSuccess = await PostToFcmAsync(fcmUrl!, serverKey!, payload, cancellationToken);

        // 💾 Persist Notification Record in SQL Server Table
        await PersistNotificationInSqlAsync(tenantId, null, title, body, "FCM_PUSH", isSuccess ? "Sent" : "Failed", dataPayload, cancellationToken);

        return isSuccess;
    }

    public async Task<bool> SendDeviceNotificationAsync(int tenantId, string deviceToken, string title, string body, object? dataPayload = null, CancellationToken cancellationToken = default)
    {
        var enabled = await _configService.GetSettingAsync<bool>("Firebase.EnablePushNotifications", tenantId, null, true, cancellationToken);
        if (!enabled) return false;

        var serverKey = await _configService.GetSettingAsync<string>("Firebase.ServerKey", tenantId, null, "AAAA-MOCK-FIREBASE-SERVER-KEY-123456", cancellationToken);
        var fcmUrl = await _configService.GetSettingAsync<string>("Firebase.FcmEndpoint", tenantId, null, "https://fcm.googleapis.com/fcm/send", cancellationToken);

        var payload = new
        {
            to = deviceToken,
            notification = new
            {
                title = title,
                body = body,
                sound = "default"
            },
            data = dataPayload ?? new { }
        };

        var isSuccess = await PostToFcmAsync(fcmUrl!, serverKey!, payload, cancellationToken);

        // 💾 Persist Notification Record in SQL Server Table
        await PersistNotificationInSqlAsync(tenantId, null, title, body, "FCM_PUSH", isSuccess ? "Sent" : "Failed", dataPayload, cancellationToken);

        return isSuccess;
    }

    private async Task<bool> PostToFcmAsync(string fcmUrl, string serverKey, object payload, CancellationToken cancellationToken)
    {
        try
        {
            var json = JsonSerializer.Serialize(payload);
            using var req = new HttpRequestMessage(HttpMethod.Post, fcmUrl);
            req.Headers.TryAddWithoutValidation("Authorization", $"key={serverKey}");
            req.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(req, cancellationToken);
            var respBody = await response.Content.ReadAsStringAsync(cancellationToken);

            _logger.LogInformation("Firebase FCM Push Notification sent with Status {Status}: {ResponseBody}", response.StatusCode, respBody.Length > 200 ? respBody.Substring(0, 200) : respBody);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send Firebase FCM push notification.");
            return false;
        }
    }

    private async Task PersistNotificationInSqlAsync(int tenantId, int? userId, string title, string message, string type, string status, object? dataPayload, CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<DmsDbContext>();

            var notif = new Notification
            {
                TenantId = tenantId,
                UserId = userId,
                Title = title,
                Message = message,
                NotificationType = type,
                Status = status,
                DataJson = dataPayload != null ? JsonSerializer.Serialize(dataPayload) : "{}",
                IsRead = false,
                CreatedDate = DateTime.UtcNow
            };

            dbContext.Notifications.Add(notif);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist Notification record in SQL database.");
        }
    }
}
