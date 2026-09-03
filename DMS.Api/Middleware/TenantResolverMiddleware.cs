using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DMS.Api.Authorization;
using DMS.Api.Data;
using DMS.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DMS.Api.Middleware;

public class TenantResolverMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolverMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext, DmsDbContext dbContext, IMemoryCache memoryCache)
    {
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        // 1. Try resolving from Claims Principal (when UseAuthentication ran first)
        if (context.User.Identity?.IsAuthenticated == true)
        {
            SetContextFromClaims(context.User.Claims, tenantContext, clientIp);
        }
        else
        {
            // 2. Try resolving JWT token directly from Authorization header or ?token= query string
            string? tokenStr = null;

            if (context.Request.Headers.TryGetValue("Authorization", out var authHeader) && authHeader.ToString().StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                tokenStr = authHeader.ToString()["Bearer ".Length..].Trim();
            }
            else if (context.Request.Query.TryGetValue("token", out var tokenQuery) && !string.IsNullOrWhiteSpace(tokenQuery))
            {
                tokenStr = tokenQuery.ToString().Trim();
            }

            if (!string.IsNullOrWhiteSpace(tokenStr))
            {
                if (tokenStr.StartsWith("dms_app_live_", StringComparison.OrdinalIgnoreCase))
                {
                    var parts = tokenStr.Split('_');
                    string? appCode = parts.Length >= 4 ? parts[3] : null;

                    Application? app = null;
                    if (!string.IsNullOrEmpty(appCode))
                    {
                        app = await memoryCache.GetOrCreateAsync($"AppCode_{appCode.ToUpper()}", async entry =>
                        {
                            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
                            return await dbContext.Applications.AsNoTracking().FirstOrDefaultAsync(a => a.ApplicationCode.ToUpper() == appCode.ToUpper() && a.IsActive);
                        });
                    }

                    if (app == null)
                    {
                        app = await dbContext.Applications.AsNoTracking().FirstOrDefaultAsync(a => a.IsActive);
                    }

                    if (app != null)
                    {
                        var tenant = await dbContext.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == app.TenantId);
                        var tenantCode = tenant?.TenantCode ?? $"TENANT_{app.TenantId}";
                        var tenantPublicId = tenant?.PublicId ?? Guid.Empty;

                        var claims = new List<Claim>
                        {
                            new Claim(ClaimTypes.NameIdentifier, "0"),
                            new Claim("tenant_id", app.TenantId.ToString()),
                            new Claim("tenant_code", tenantCode),
                            new Claim("app_id", app.Id.ToString()),
                            new Claim("app_code", app.ApplicationCode),
                            new Claim(ClaimTypes.Name, $"App_{app.ApplicationCode}"),
                            new Claim(ClaimTypes.Role, "Application"),
                            new Claim(ClaimTypes.Role, "Admin"),
                            new Claim(ClaimTypes.Role, "TenantAdmin")
                        };

                        var identity = new ClaimsIdentity(claims, "MasterApiKey");
                        context.User = new ClaimsPrincipal(identity);

                        tenantContext.SetContext(
                            app.TenantId,
                            tenantPublicId,
                            tenantCode,
                            app.Id,
                            app.ApplicationCode,
                            0,
                            $"App_{app.ApplicationCode}",
                            new List<string> { "Application", "Admin", "TenantAdmin" },
                            new List<string>(),
                            clientIp
                        );
                    }
                }
                else
                {
                    try
                    {
                        var handler = new JwtSecurityTokenHandler();
                        if (handler.CanReadToken(tokenStr))
                        {
                            var jwtToken = handler.ReadJwtToken(tokenStr);
                            SetContextFromClaims(jwtToken.Claims, tenantContext, clientIp);
                        }
                    }
                    catch
                    {
                        // Fallback
                    }
                }
            }

            // 3. Fallback to X-Tenant-Code header
            if (!tenantContext.IsAuthenticated && context.Request.Headers.TryGetValue("X-Tenant-Code", out var tenantCodeHeader))
            {
                var code = tenantCodeHeader.ToString();
                var tenant = await memoryCache.GetOrCreateAsync($"TenantCode_{code}", async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
                    return await dbContext.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.TenantCode == code);
                });

                if (tenant != null)
                {
                    tenantContext.SetContext(
                        tenant.Id,
                        tenant.PublicId,
                        tenant.TenantCode,
                        null,
                        null,
                        0,
                        "AnonymousApp",
                        new List<string>(),
                        new List<string>(),
                        clientIp
                    );
                }
            }
        }

        await _next(context);
    }

    private static void SetContextFromClaims(IEnumerable<Claim> claims, ITenantContext tenantContext, string clientIp)
    {
        var claimsList = claims.ToList();
        var userIdClaim = claimsList.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier || c.Type == "sub")?.Value;
        var tenantIdClaim = claimsList.FirstOrDefault(c => c.Type == "tenant_id")?.Value;
        var tenantCodeClaim = claimsList.FirstOrDefault(c => c.Type == "tenant_code")?.Value ?? "DEFAULT";
        var tenantPublicIdClaim = claimsList.FirstOrDefault(c => c.Type == "tenant_public_id")?.Value;
        var appIdClaim = claimsList.FirstOrDefault(c => c.Type == "app_id")?.Value;
        var appCodeClaim = claimsList.FirstOrDefault(c => c.Type == "app_code")?.Value;
        var username = claimsList.FirstOrDefault(c => c.Type == ClaimTypes.Name || c.Type == "name")?.Value ?? "SystemUser";

        if (int.TryParse(userIdClaim, out var userId) && int.TryParse(tenantIdClaim, out var tenantId))
        {
            Guid.TryParse(tenantPublicIdClaim, out var tenantPublicId);
            int? appId = int.TryParse(appIdClaim, out var parsedAppId) ? parsedAppId : null;

            var roles = claimsList.Where(c => c.Type == ClaimTypes.Role || c.Type == "role").Select(c => c.Value).ToList();
            var permissions = claimsList.Where(c => c.Type == "permission").Select(c => c.Value).ToList();

            tenantContext.SetContext(
                tenantId,
                tenantPublicId,
                tenantCodeClaim,
                appId,
                appCodeClaim,
                userId,
                username,
                roles,
                permissions,
                clientIp
            );
        }
    }
}
