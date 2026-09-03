namespace DMS.Api.Authorization;

public interface ITenantContext
{
    int TenantId { get; }
    Guid TenantPublicId { get; }
    string TenantCode { get; }
    int? ApplicationId { get; }
    string? ApplicationCode { get; }
    int UserId { get; }
    string Username { get; }
    List<string> Roles { get; }
    List<string> Permissions { get; }
    bool IsAuthenticated { get; }
    string ClientIpAddress { get; }

    void SetContext(int tenantId, Guid tenantPublicId, string tenantCode, int? applicationId, string? applicationCode, int userId, string username, List<string> roles, List<string> permissions, string clientIpAddress);
}

public class TenantContext : ITenantContext
{
    public int TenantId { get; private set; }
    public Guid TenantPublicId { get; private set; }
    public string TenantCode { get; private set; } = string.Empty;
    public int? ApplicationId { get; private set; }
    public string? ApplicationCode { get; private set; }
    public int UserId { get; private set; }
    public string Username { get; private set; } = string.Empty;
    public List<string> Roles { get; private set; } = new();
    public List<string> Permissions { get; private set; } = new();
    public bool IsAuthenticated => TenantId > 0 && UserId > 0;
    public string ClientIpAddress { get; private set; } = "127.0.0.1";

    public void SetContext(int tenantId, Guid tenantPublicId, string tenantCode, int? applicationId, string? applicationCode, int userId, string username, List<string> roles, List<string> permissions, string clientIpAddress)
    {
        TenantId = tenantId;
        TenantPublicId = tenantPublicId;
        TenantCode = tenantCode;
        ApplicationId = applicationId;
        ApplicationCode = applicationCode;
        UserId = userId;
        Username = username;
        Roles = roles ?? new List<string>();
        Permissions = permissions ?? new List<string>();
        ClientIpAddress = clientIpAddress;
    }
}
