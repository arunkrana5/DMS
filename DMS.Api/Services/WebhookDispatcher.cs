using System.Text.Json;
using System.Threading.Channels;
using DMS.Api.Entities;

namespace DMS.Api.Services;

public class WebhookMessage
{
    public int TenantId { get; set; }
    public int? ApplicationId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public object Payload { get; set; } = new();
}

public interface IWebhookDispatcher
{
    ValueTask DispatchAsync(int tenantId, int? applicationId, string eventType, object payload);
}

public class WebhookDispatcher : IWebhookDispatcher
{
    private readonly Channel<WebhookMessage> _channel;

    public WebhookDispatcher()
    {
        var options = new BoundedChannelOptions(5000)
        {
            SingleReader = true,
            FullMode = BoundedChannelFullMode.DropOldest
        };
        _channel = Channel.CreateBounded<WebhookMessage>(options);
    }

    public ChannelReader<WebhookMessage> Reader => _channel.Reader;

    public ValueTask DispatchAsync(int tenantId, int? applicationId, string eventType, object payload)
    {
        var msg = new WebhookMessage
        {
            TenantId = tenantId,
            ApplicationId = applicationId,
            EventType = eventType,
            Payload = payload
        };
        return _channel.Writer.WriteAsync(msg);
    }
}
