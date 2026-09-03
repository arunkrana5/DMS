using DMS.Api.Authorization;
using DMS.Api.Common;
using DMS.Api.Data;
using DMS.Api.DTOs;
using DMS.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DMS.Api.Controllers;

[ApiController]
[Route("api/v1/tenants")]
[Authorize]
public class TenantsController : ControllerBase
{
    private readonly DmsDbContext _dbContext;

    public TenantsController(DmsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetTenants(
        [FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Tenants.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(t => t.TenantCode.ToLower().Contains(s) || t.TenantName.ToLower().Contains(s) || (t.ContactEmail != null && t.ContactEmail.ToLower().Contains(s)));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(t => t.TenantCode)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TenantDto
            {
                Id = t.Id,
                PublicId = t.PublicId,
                TenantCode = t.TenantCode,
                TenantName = t.TenantName,
                Description = t.Description,
                ContactEmail = t.ContactEmail,
                PrimaryColor = t.PrimaryColor,
                IsActive = t.IsActive,
                CreatedDate = t.CreatedDate,
                UserCount = _dbContext.Users.Count(u => u.TenantId == t.Id),
                AppCount = _dbContext.Applications.Count(a => a.TenantId == t.Id)
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<PagedResult<TenantDto>>.Ok(new PagedResult<TenantDto>
        {
            Items = items,
            TotalCount = total,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        }));
    }

    [HttpPost]
    public async Task<IActionResult> CreateTenant([FromBody] CreateTenantRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.TenantCode) || string.IsNullOrWhiteSpace(request.TenantName))
        {
            return BadRequest(ApiResponse.Fail("DMS015", "TenantCode and TenantName are required."));
        }

        var code = request.TenantCode.Trim().ToUpper();
        if (await _dbContext.Tenants.AnyAsync(t => t.TenantCode == code, cancellationToken))
        {
            return BadRequest(ApiResponse.Fail("DMS015", $"TenantCode '{code}' already exists."));
        }

        var tenant = new Tenant
        {
            TenantCode = code,
            TenantName = request.TenantName.Trim(),
            Description = request.Description,
            ContactEmail = request.ContactEmail,
            PrimaryColor = request.PrimaryColor ?? "#2563EB",
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.Tenants.Add(tenant);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Auto-create Admin Role for Tenant
        var role = new Role
        {
            TenantId = tenant.Id,
            RoleCode = "ADMIN",
            RoleName = "Tenant Administrator",
            Description = "Default Tenant Administrator Role"
        };
        _dbContext.Roles.Add(role);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Auto-create Admin User for Tenant
        var user = new User
        {
            TenantId = tenant.Id,
            Username = string.IsNullOrWhiteSpace(request.AdminUsername) ? "admin" : request.AdminUsername.Trim(),
            Email = request.ContactEmail ?? $"admin@{code.ToLower()}.com",
            PasswordHash = string.IsNullOrWhiteSpace(request.AdminPassword) ? "Password123!" : request.AdminPassword,
            FullName = request.TenantName + " Admin",
            RoleId = role.Id,
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };
        _dbContext.Users.Add(user);

        // Auto-create Default Local Storage Profile for Tenant
        var storageProfile = new StorageProfile
        {
            TenantId = tenant.Id,
            Name = "Local Storage",
            ProviderCode = "LOCAL",
            IsDefault = true,
            IsActive = true,
            ConfigurationJsonEncrypted = "{}",
            CreatedBy = 1,
            CreatedDate = DateTime.UtcNow
        };
        _dbContext.StorageProfiles.Add(storageProfile);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse<TenantDto>.Ok(new TenantDto
        {
            Id = tenant.Id,
            PublicId = tenant.PublicId,
            TenantCode = tenant.TenantCode,
            TenantName = tenant.TenantName,
            Description = tenant.Description,
            ContactEmail = tenant.ContactEmail,
            PrimaryColor = tenant.PrimaryColor,
            IsActive = tenant.IsActive,
            CreatedDate = tenant.CreatedDate,
            UserCount = 1,
            AppCount = 0
        }, $"Tenant '{tenant.TenantCode}' created successfully with admin user '{user.Username}'."));
    }

    [HttpGet("{tenantId:int}/users")]
    public async Task<IActionResult> GetTenantUsers(int tenantId, CancellationToken cancellationToken)
    {
        var users = await _dbContext.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Where(u => u.TenantId == tenantId)
            .Select(u => new UserDto
            {
                Id = u.Id,
                TenantId = u.TenantId,
                Username = u.Username,
                Email = u.Email,
                FullName = u.FullName,
                RoleName = u.Role != null ? u.Role.RoleName : "User",
                IsActive = u.IsActive,
                CreatedDate = u.CreatedDate
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<List<UserDto>>.Ok(users));
    }

    [HttpPost("{tenantId:int}/users")]
    public async Task<IActionResult> CreateTenantUser(int tenantId, [FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var tenant = await _dbContext.Tenants.FindAsync(new object[] { tenantId }, cancellationToken);
        if (tenant == null)
        {
            return NotFound(ApiResponse.Fail("DMS016", $"Tenant #{tenantId} not found."));
        }

        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(ApiResponse.Fail("DMS017", "Username and Password are required."));
        }

        var username = request.Username.Trim();
        if (await _dbContext.Users.AnyAsync(u => u.TenantId == tenantId && u.Username == username, cancellationToken))
        {
            return BadRequest(ApiResponse.Fail("DMS018", $"Username '{username}' already exists for this tenant."));
        }

        // Find or create role
        var role = await _dbContext.Roles.FirstOrDefaultAsync(r => r.TenantId == tenantId && r.RoleCode == (request.RoleCode ?? "USER"), cancellationToken);
        if (role == null)
        {
            role = new Role
            {
                TenantId = tenantId,
                RoleCode = request.RoleCode ?? "USER",
                RoleName = request.RoleCode ?? "User",
                Description = "Tenant User Role"
            };
            _dbContext.Roles.Add(role);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var user = new User
        {
            TenantId = tenantId,
            Username = username,
            Email = request.Email ?? $"{username}@{tenant.TenantCode.ToLower()}.com",
            PasswordHash = request.Password,
            FullName = request.FullName ?? username,
            RoleId = role.Id,
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse<UserDto>.Ok(new UserDto
        {
            Id = user.Id,
            TenantId = user.TenantId,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            RoleName = role.RoleName,
            IsActive = user.IsActive,
            CreatedDate = user.CreatedDate
        }, $"User '{user.Username}' created successfully for Tenant '{tenant.TenantCode}'."));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateTenant(int id, [FromBody] UpdateTenantRequest request, CancellationToken cancellationToken)
    {
        var tenant = await _dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (tenant == null)
        {
            return NotFound(ApiResponse.Fail("DMS019", $"Tenant #{id} not found."));
        }

        tenant.TenantName = request.TenantName.Trim();
        tenant.Description = request.Description;
        tenant.ContactEmail = request.ContactEmail;
        if (!string.IsNullOrWhiteSpace(request.PrimaryColor))
        {
            tenant.PrimaryColor = request.PrimaryColor;
        }
        tenant.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse<TenantDto>.Ok(new TenantDto
        {
            Id = tenant.Id,
            PublicId = tenant.PublicId,
            TenantCode = tenant.TenantCode,
            TenantName = tenant.TenantName,
            Description = tenant.Description,
            ContactEmail = tenant.ContactEmail,
            PrimaryColor = tenant.PrimaryColor,
            IsActive = tenant.IsActive,
            CreatedDate = tenant.CreatedDate,
            UserCount = _dbContext.Users.Count(u => u.TenantId == tenant.Id),
            AppCount = _dbContext.Applications.Count(a => a.TenantId == tenant.Id)
        }, "Tenant updated successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTenant(int id, CancellationToken cancellationToken)
    {
        var tenant = await _dbContext.Tenants.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (tenant == null)
        {
            return NotFound(ApiResponse.Fail("DMS019", $"Tenant #{id} not found."));
        }

        _dbContext.Tenants.Remove(tenant);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse.Ok("Tenant deleted successfully."));
    }

    [HttpDelete("{tenantId:int}/users/{userId:int}")]
    public async Task<IActionResult> DeleteTenantUser(int tenantId, int userId, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Id == userId, cancellationToken);
        if (user == null)
        {
            return NotFound(ApiResponse.Fail("DMS020", "User not found under this tenant."));
        }

        _dbContext.Users.Remove(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse.Ok("Tenant user removed successfully."));
    }
}

public class TenantDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public string TenantCode { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ContactEmail { get; set; }
    public string? PrimaryColor { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }
    public int UserCount { get; set; }
    public int AppCount { get; set; }
}

public class UserDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class CreateTenantRequest
{
    public string TenantCode { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ContactEmail { get; set; }
    public string? PrimaryColor { get; set; }
    public string? AdminUsername { get; set; } = "admin";
    public string? AdminPassword { get; set; } = "Password123!";
}

public class UpdateTenantRequest
{
    public string TenantName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ContactEmail { get; set; }
    public string? PrimaryColor { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreateUserRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? FullName { get; set; }
    public string? RoleCode { get; set; } = "USER";
}
