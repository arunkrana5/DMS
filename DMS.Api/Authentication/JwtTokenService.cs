using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DMS.Api.Entities;
using DMS.Api.Services;
using Microsoft.IdentityModel.Tokens;

namespace DMS.Api.Authentication;

public class JwtTokenService
{
    private readonly IConfigSettingsService _configService;

    public JwtTokenService(IConfigSettingsService configService)
    {
        _configService = configService;
    }

    public async Task<string> GenerateTokenAsync(User user, Tenant tenant, Application? app = null, IEnumerable<string>? roles = null, IEnumerable<string>? permissions = null, CancellationToken cancellationToken = default)
    {
        var secretKey = await _configService.GetSettingAsync<string>("Jwt.SecretKey", tenant.Id, app?.Id, cancellationToken: cancellationToken);

        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException("JWT SecretKey is not configured in ConfigSettings database table.");
        }

        var issuer = await _configService.GetSettingAsync<string>("Jwt.Issuer", tenant.Id, app?.Id, "DMS.Api", cancellationToken) ?? "DMS.Api";
        var audience = await _configService.GetSettingAsync<string>("Jwt.Audience", tenant.Id, app?.Id, "DMS.Clients", cancellationToken) ?? "DMS.Clients";
        var expiryMinutes = await _configService.GetSettingAsync<int>("Jwt.ExpiryMinutes", tenant.Id, app?.Id, 480, cancellationToken);

        var rawBytes = Encoding.UTF8.GetBytes(secretKey);
        byte[] keyBytes = rawBytes.Length >= 32
            ? rawBytes
            : System.Security.Cryptography.SHA256.HashData(rawBytes);

        var key = new SymmetricSecurityKey(keyBytes);
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var now = DateTime.UtcNow;
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat, new DateTimeOffset(now).ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
            new(JwtRegisteredClaimNames.Nbf, new DateTimeOffset(now).ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new("user_public_id", user.PublicId.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Email, user.Email),
            new("tenant_id", tenant.Id.ToString()),
            new("tenant_public_id", tenant.PublicId.ToString()),
            new("tenant_code", tenant.TenantCode)
        };

        if (app != null)
        {
            claims.Add(new Claim("app_id", app.Id.ToString()));
            claims.Add(new Claim("app_code", app.ApplicationCode));
        }

        if (roles != null)
        {
            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }
        }

        if (permissions != null)
        {
            foreach (var permission in permissions)
            {
                claims.Add(new Claim("permission", permission));
            }
        }

        var expires = now.AddMinutes(expiryMinutes > 0 ? expiryMinutes : 480);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
