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
[Route("api/v1/[controller]")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly DmsDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public RolesController(DmsDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetRoles(
        [FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = _tenantContext.TenantCode == "SUPERADMIN" || _tenantContext.Roles.Contains("SUPERADMIN");
        var query = _dbContext.Roles.AsNoTracking();

        if (!isSuperAdmin)
        {
            query = query.Where(r => r.TenantId == tenantId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(r => r.RoleName.ToLower().Contains(s) || r.RoleCode.ToLower().Contains(s));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Include(r => r.RolePermissions)
            .ThenInclude(rp => rp.Permission)
            .OrderBy(r => r.RoleName)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new RoleDto
            {
                Id = r.Id,
                PublicId = r.PublicId,
                TenantId = r.TenantId,
                RoleCode = r.RoleCode,
                RoleName = r.RoleName,
                Description = r.Description,
                IsActive = r.IsActive,
                PermissionIds = r.RolePermissions.Select(rp => rp.PermissionId).ToList(),
                PermissionCodes = r.RolePermissions.Where(rp => rp.Permission != null).Select(rp => rp.Permission!.PermissionCode).ToList(),
                CreatedDate = r.CreatedDate
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<PagedResult<RoleDto>>.Ok(new PagedResult<RoleDto>
        {
            Items = items,
            TotalCount = total,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        }));
    }

    [HttpGet("permissions")]
    public async Task<IActionResult> GetPermissions(CancellationToken cancellationToken)
    {
        var permissions = await _dbContext.Permissions
            .AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.Category)
            .ThenBy(p => p.PermissionName)
            .Select(p => new PermissionDto
            {
                Id = p.Id,
                PublicId = p.PublicId,
                PermissionCode = p.PermissionCode,
                PermissionName = p.PermissionName,
                Category = p.Category,
                Description = p.Description
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<List<PermissionDto>>.Ok(permissions));
    }

    [HttpPost]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request, CancellationToken cancellationToken)
    {
        var targetTenantId = request.TenantId.HasValue && request.TenantId.Value > 0
            ? request.TenantId.Value
            : _tenantContext.TenantId;

        var roleCode = request.RoleCode.Trim().ToUpper();

        var existing = await _dbContext.Roles.FirstOrDefaultAsync(r => r.TenantId == targetTenantId && r.RoleCode == roleCode, cancellationToken);
        if (existing != null)
        {
            return BadRequest(ApiResponse.Fail("DMS040", $"Role with code '{roleCode}' already exists under this tenant."));
        }

        var role = new Role
        {
            TenantId = targetTenantId,
            RoleCode = roleCode,
            RoleName = request.RoleName.Trim(),
            Description = request.Description,
            IsActive = true,
            CreatedDate = DateTime.UtcNow,
            CreatedBy = _tenantContext.UserId > 0 ? _tenantContext.UserId : 1
        };

        _dbContext.Roles.Add(role);
        await _dbContext.SaveChangesAsync(cancellationToken);

        if (request.PermissionIds != null && request.PermissionIds.Any())
        {
            var rps = request.PermissionIds.Select(pId => new RolePermission
            {
                TenantId = targetTenantId,
                RoleId = role.Id,
                PermissionId = pId,
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
                CreatedBy = _tenantContext.UserId > 0 ? _tenantContext.UserId : 1
            });
            _dbContext.RolePermissions.AddRange(rps);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return Ok(ApiResponse.Ok(null, $"Role '{role.RoleName}' created and permissions assigned successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleRequest request, CancellationToken cancellationToken)
    {
        var role = await _dbContext.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

        if (role == null)
        {
            return NotFound(ApiResponse.Fail("DMS041", "Role not found."));
        }

        role.RoleName = request.RoleName.Trim();
        role.Description = request.Description;
        role.IsActive = request.IsActive;
        role.ModifiedDate = DateTime.UtcNow;

        // Update permissions
        _dbContext.RolePermissions.RemoveRange(role.RolePermissions);
        if (request.PermissionIds != null && request.PermissionIds.Any())
        {
            var newRps = request.PermissionIds.Select(pId => new RolePermission
            {
                TenantId = role.TenantId,
                RoleId = role.Id,
                PermissionId = pId,
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
                CreatedBy = _tenantContext.UserId > 0 ? _tenantContext.UserId : 1
            });
            _dbContext.RolePermissions.AddRange(newRps);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ApiResponse.Ok(null, $"Role '{role.RoleName}' updated successfully."));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteRole(int id, CancellationToken cancellationToken)
    {
        var role = await _dbContext.Roles.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (role == null) return NotFound(ApiResponse.Fail("DMS041", "Role not found."));

        _dbContext.Roles.Remove(role);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ApiResponse.Ok(null, $"Role '{role.RoleName}' deleted successfully."));
    }
}
