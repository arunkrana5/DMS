using DMS.Api.Authorization;
using DMS.Api.Common;
using DMS.Api.Data;
using DMS.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DMS.Api.Controllers;

[ApiController]
[Route("api/v1/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly DmsDbContext _dbContext;
    private readonly ITenantContext _tenantContext;

    public NotificationsController(DmsDbContext dbContext, ITenantContext tenantContext)
    {
        _dbContext = dbContext;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] int pageIndex = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? unreadOnly = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = string.Equals(_tenantContext.TenantCode, "SUPERADMIN", StringComparison.OrdinalIgnoreCase) || (_tenantContext.Roles != null && _tenantContext.Roles.Contains("SUPERADMIN"));

        var query = _dbContext.Notifications
            .AsNoTracking()
            .Where(n => isSuperAdmin || n.TenantId == tenantId);

        if (unreadOnly == true)
        {
            query = query.Where(n => !n.IsRead);
        }

        var total = await query.CountAsync(cancellationToken);
        var unreadCount = await _dbContext.Notifications.CountAsync(n => (isSuperAdmin || n.TenantId == tenantId) && !n.IsRead, cancellationToken);

        var items = await query
            .OrderByDescending(n => n.CreatedDate)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new
            {
                n.Id,
                n.PublicId,
                n.TenantId,
                n.UserId,
                n.Title,
                n.Message,
                n.NotificationType,
                n.DataJson,
                n.IsRead,
                n.Status,
                n.CreatedDate
            })
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<object>.Ok(new
        {
            Items = items,
            TotalCount = total,
            UnreadCount = unreadCount,
            PageIndex = pageIndex,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        }));
    }

    [HttpPut("{id:int}/read")]
    public async Task<IActionResult> MarkAsRead(int id, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = string.Equals(_tenantContext.TenantCode, "SUPERADMIN", StringComparison.OrdinalIgnoreCase) || (_tenantContext.Roles != null && _tenantContext.Roles.Contains("SUPERADMIN"));

        var notif = await _dbContext.Notifications.FirstOrDefaultAsync(n => n.Id == id && (isSuperAdmin || n.TenantId == tenantId), cancellationToken);
        if (notif == null) return NotFound(ApiResponse.Fail("DMS021", "Notification not found."));

        notif.IsRead = true;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse.Ok("Notification marked as read."));
    }

    [HttpPut("mark-all-read")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = string.Equals(_tenantContext.TenantCode, "SUPERADMIN", StringComparison.OrdinalIgnoreCase) || (_tenantContext.Roles != null && _tenantContext.Roles.Contains("SUPERADMIN"));

        var unread = await _dbContext.Notifications.Where(n => (isSuperAdmin || n.TenantId == tenantId) && !n.IsRead).ToListAsync(cancellationToken);
        foreach (var n in unread) n.IsRead = true;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(ApiResponse.Ok($"Marked {unread.Count} notifications as read."));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteNotification(int id, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId;
        var isSuperAdmin = string.Equals(_tenantContext.TenantCode, "SUPERADMIN", StringComparison.OrdinalIgnoreCase) || (_tenantContext.Roles != null && _tenantContext.Roles.Contains("SUPERADMIN"));

        var notif = await _dbContext.Notifications.FirstOrDefaultAsync(n => n.Id == id && (isSuperAdmin || n.TenantId == tenantId), cancellationToken);
        if (notif == null) return NotFound(ApiResponse.Fail("DMS021", "Notification not found."));

        _dbContext.Notifications.Remove(notif);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse.Ok("Notification deleted successfully."));
    }
}
