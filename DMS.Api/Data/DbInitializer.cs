using Microsoft.EntityFrameworkCore;

namespace DMS.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(DmsDbContext dbContext)
    {
        // Ensures database schema is created.
        // Zero hardcoded seed inserts: all tenants, roles, users, storage profiles, permissions, and settings are added from the UI.
        await dbContext.Database.EnsureCreatedAsync();
    }
}
