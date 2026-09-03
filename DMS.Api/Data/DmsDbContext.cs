using DMS.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DMS.Api.Data;

public class DmsDbContext : DbContext
{
    public DmsDbContext(DbContextOptions<DmsDbContext> options) : base(options)
    {
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Application> Applications => Set<Application>();
    public DbSet<ApiClient> ApiClients => Set<ApiClient>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Folder> Folders => Set<Folder>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentVersion> DocumentVersions => Set<DocumentVersion>();
    public DbSet<StorageProfile> StorageProfiles => Set<StorageProfile>();
    public DbSet<StorageRoutingRule> StorageRoutingRules => Set<StorageRoutingRule>();
    public DbSet<StorageMigrationJob> StorageMigrationJobs => Set<StorageMigrationJob>();
    public DbSet<DocumentType> DocumentTypes => Set<DocumentType>();
    public DbSet<CustomField> CustomFields => Set<CustomField>();
    public DbSet<DocumentCustomFieldValue> DocumentCustomFieldValues => Set<DocumentCustomFieldValue>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<DocumentTag> DocumentTags => Set<DocumentTag>();
    public DbSet<DocumentPermission> DocumentPermissions => Set<DocumentPermission>();
    public DbSet<FolderPermission> FolderPermissions => Set<FolderPermission>();
    public DbSet<TenantFilePolicy> TenantFilePolicies => Set<TenantFilePolicy>();
    public DbSet<RetentionPolicy> RetentionPolicies => Set<RetentionPolicy>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<IdempotencyKey> IdempotencyKeys => Set<IdempotencyKey>();
    public DbSet<Webhook> Webhooks => Set<Webhook>();
    public DbSet<WebhookDelivery> WebhookDeliveries => Set<WebhookDelivery>();
    public DbSet<ConfigSetting> ConfigSettings => Set<ConfigSetting>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<TenantModule> TenantModules => Set<TenantModule>();
    public DbSet<ModuleDocumentType> ModuleDocumentTypes => Set<ModuleDocumentType>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply Soft Delete global query filter to all BaseEntity derivatives
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder.Entity(entityType.ClrType)
                    .HasQueryFilter(ConvertIsDeletedFilter(entityType.ClrType));
            }
        }

        // Composite Indexes for High Performance & Multi-Tenant Uniqueness
        modelBuilder.Entity<Tenant>()
            .HasIndex(t => t.TenantCode)
            .IsUnique();

        modelBuilder.Entity<Role>()
            .HasIndex(r => new { r.TenantId, r.RoleCode })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => new { u.TenantId, u.Username })
            .IsUnique();

        modelBuilder.Entity<Application>()
            .HasIndex(a => new { a.TenantId, a.ApplicationCode })
            .IsUnique();

        modelBuilder.Entity<ConfigSetting>()
            .HasIndex(c => new { c.TenantId, c.ApplicationId, c.SettingKey });

        modelBuilder.Entity<Document>()
            .HasIndex(d => new { d.TenantId, d.ApplicationId, d.ModuleCode, d.EntityType, d.EntityId });

        modelBuilder.Entity<Document>()
            .HasIndex(d => new { d.TenantId, d.FileName });

        modelBuilder.Entity<Folder>()
            .HasIndex(f => new { f.TenantId, f.ParentFolderId, f.Name });

        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => new { a.TenantId, a.CreatedDate });

        modelBuilder.Entity<IdempotencyKey>()
            .HasIndex(i => new { i.TenantId, i.Key })
            .IsUnique();

        // Prevent multiple cascade delete paths in SQL Server
        foreach (var relationship in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
        {
            relationship.DeleteBehavior = DeleteBehavior.Restrict;
        }

        // Explicit Cascade Rules for owned sub-items
        modelBuilder.Entity<DocumentVersion>()
            .HasOne(dv => dv.Document)
            .WithMany(d => d.Versions)
            .HasForeignKey(dv => dv.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DocumentCustomFieldValue>()
            .HasOne(cv => cv.Document)
            .WithMany(d => d.CustomFieldValues)
            .HasForeignKey(cv => cv.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DocumentTag>()
            .HasOne(dt => dt.Document)
            .WithMany(d => d.DocumentTags)
            .HasForeignKey(dt => dt.DocumentId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static System.Linq.Expressions.LambdaExpression ConvertIsDeletedFilter(Type entityType)
    {
        var parameter = System.Linq.Expressions.Expression.Parameter(entityType, "e");
        var propertyMethod = typeof(EF).GetMethod(nameof(EF.Property))!.MakeGenericMethod(typeof(bool));
        var isDeletedProperty = System.Linq.Expressions.Expression.Call(propertyMethod, parameter, System.Linq.Expressions.Expression.Constant("IsDeleted"));
        var compareExpression = System.Linq.Expressions.Expression.Equal(isDeletedProperty, System.Linq.Expressions.Expression.Constant(false));
        return System.Linq.Expressions.Expression.Lambda(compareExpression, parameter);
    }
}
