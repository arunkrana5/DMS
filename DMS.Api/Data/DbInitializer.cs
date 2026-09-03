using System.Security.Cryptography;
using DMS.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DMS.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(DmsDbContext dbContext)
    {
        await dbContext.Database.EnsureCreatedAsync();

        // 1. Ensure schema objects (Tables / Columns) exist for Notifications, TenantModules, and ModuleDocumentTypes
        await dbContext.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
            BEGIN
                CREATE TABLE [dbo].[Notifications] (
                    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [PublicId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
                    [TenantId] INT NOT NULL,
                    [UserId] INT NULL,
                    [DocumentId] INT NULL,
                    [Title] NVARCHAR(255) NOT NULL,
                    [Message] NVARCHAR(1000) NOT NULL,
                    [NotificationType] NVARCHAR(50) NOT NULL DEFAULT 'FCM_PUSH',
                    [DataJson] NVARCHAR(MAX) NULL,
                    [IsRead] BIT NOT NULL DEFAULT 0,
                    [Status] NVARCHAR(50) NULL DEFAULT 'Sent',
                    [Priority] INT NULL,
                    [IPAddress] NVARCHAR(50) NULL,
                    [IsActive] BIT NOT NULL DEFAULT 1,
                    [IsDeleted] BIT NOT NULL DEFAULT 0,
                    [CreatedBy] INT NULL,
                    [CreatedDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                    [ModifiedBy] INT NULL,
                    [ModifiedDate] DATETIME2 NULL,
                    [DeletedBy] INT NULL,
                    [DeletedDate] DATETIME2 NULL
                );
            END

            IF EXISTS (SELECT * FROM sys.tables WHERE name = 'DocumentTypes')
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('DocumentTypes') AND name = 'IsMandatory')
                    ALTER TABLE [dbo].[DocumentTypes] ADD [IsMandatory] BIT NOT NULL DEFAULT 0;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('DocumentTypes') AND name = 'ModuleCode')
                    ALTER TABLE [dbo].[DocumentTypes] ADD [ModuleCode] NVARCHAR(50) NULL;
            END

            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TenantModules')
            BEGIN
                CREATE TABLE [dbo].[TenantModules] (
                    [Id] INT IDENTITY(1,1) PRIMARY KEY,
                    [PublicId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
                    [TenantId] INT NOT NULL,
                    [ModuleCode] NVARCHAR(50) NOT NULL,
                    [ModuleName] NVARCHAR(100) NOT NULL,
                    [Description] NVARCHAR(500) NULL,
                    [DisplayOrder] INT NOT NULL DEFAULT 0,
                    [Priority] INT NULL,
                    [IPAddress] NVARCHAR(50) NULL,
                    [IsActive] BIT NOT NULL DEFAULT 1,
                    [IsDeleted] BIT NOT NULL DEFAULT 0,
                    [CreatedBy] INT NULL,
                    [CreatedDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                    [ModifiedBy] INT NULL,
                    [ModifiedDate] DATETIME2 NULL,
                    [DeletedBy] INT NULL,
                    [DeletedDate] DATETIME2 NULL
                );
            END

            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ModuleDocumentTypes')
            BEGIN
                CREATE TABLE [dbo].[ModuleDocumentTypes] (
                    [Id] INT IDENTITY(1,1) PRIMARY KEY,
                    [PublicId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
                    [TenantId] INT NOT NULL,
                    [ModuleCode] NVARCHAR(50) NOT NULL,
                    [DocumentTypeId] INT NOT NULL,
                    [IsMandatory] BIT NOT NULL DEFAULT 0,
                    [MaxAllowedFiles] INT NOT NULL DEFAULT 10,
                    [DisplayOrder] INT NOT NULL DEFAULT 0,
                    [AllowedExtensionsOverride] NVARCHAR(255) NULL,
                    [MaxFileSizeBytesOverride] BIGINT NULL,
                    [Priority] INT NULL,
                    [IPAddress] NVARCHAR(50) NULL,
                    [IsActive] BIT NOT NULL DEFAULT 1,
                    [IsDeleted] BIT NOT NULL DEFAULT 0,
                    [CreatedBy] INT NULL,
                    [CreatedDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                    [ModifiedBy] INT NULL,
                    [ModifiedDate] DATETIME2 NULL,
                    [DeletedBy] INT NULL,
                    [DeletedDate] DATETIME2 NULL
                );
            END
        ");

        if (!await dbContext.Database.CanConnectAsync()) return;

        // 2. Ensure SUPERADMIN Tenant, Role, User, and Storage Profile
        var superTenant = await dbContext.Tenants.FirstOrDefaultAsync(t => t.TenantCode == "SUPERADMIN");
        if (superTenant == null)
        {
            superTenant = new Tenant
            {
                TenantCode = "SUPERADMIN",
                TenantName = "Platform Super Administrator",
                Description = "Global Platform Management",
                ContactEmail = "superadmin@dms.platform",
                PrimaryColor = "#4F46E5",
                IsActive = true,
                CreatedDate = DateTime.UtcNow
            };
            dbContext.Tenants.Add(superTenant);
            await dbContext.SaveChangesAsync();
        }

        var superRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.TenantId == superTenant.Id && r.RoleCode == "SUPERADMIN");
        if (superRole == null)
        {
            superRole = new Role
            {
                TenantId = superTenant.Id,
                RoleCode = "SUPERADMIN",
                RoleName = "Super Administrator",
                Description = "Global System Super Administrator",
                IsActive = true,
                CreatedDate = DateTime.UtcNow
            };
            dbContext.Roles.Add(superRole);
            await dbContext.SaveChangesAsync();
        }

        if (!await dbContext.Users.AnyAsync(u => u.TenantId == superTenant.Id && u.Username == "superadmin"))
        {
            var superUser = new User
            {
                TenantId = superTenant.Id,
                Username = "superadmin",
                Email = "superadmin@dms.platform",
                PasswordHash = "SuperAdmin123!",
                FullName = "Platform Super Administrator",
                RoleId = superRole.Id,
                IsActive = true,
                CreatedDate = DateTime.UtcNow
            };
            dbContext.Users.Add(superUser);
            await dbContext.SaveChangesAsync();
        }

        if (!await dbContext.StorageProfiles.AnyAsync(sp => sp.TenantId == superTenant.Id && sp.IsActive))
        {
            var superStorage = new StorageProfile
            {
                TenantId = superTenant.Id,
                Name = "Platform SuperAdmin Default Storage",
                ProviderCode = "LOCAL",
                IsDefault = true,
                IsActive = true,
                ConfigurationJsonEncrypted = "{}",
                CreatedDate = DateTime.UtcNow
            };
            dbContext.StorageProfiles.Add(superStorage);
            await dbContext.SaveChangesAsync();
        }

        // 3. Ensure System Permissions & Map to SUPERADMIN
        var defaultPermissions = new List<Permission>
        {
            new Permission { PermissionCode = "MANAGE_TENANTS", PermissionName = "Manage Tenants", Category = "TENANTS", Description = "Full access to create, update, list, and delete tenants" },
            new Permission { PermissionCode = "MANAGE_USERS", PermissionName = "Manage Users", Category = "USERS", Description = "Full access to create, update, list, and delete users" },
            new Permission { PermissionCode = "MANAGE_ROLES", PermissionName = "Manage Roles & Permissions", Category = "ROLES", Description = "Full access to create, update, list, delete roles and assign permissions" },
            new Permission { PermissionCode = "MANAGE_APPLICATIONS", PermissionName = "Manage Applications", Category = "APPLICATIONS", Description = "Full access to register, update, list, and delete applications" },
            new Permission { PermissionCode = "MANAGE_STORAGE_PROFILES", PermissionName = "Manage Storage Profiles", Category = "STORAGE", Description = "Full access to create, update, list, and delete storage profiles" },
            new Permission { PermissionCode = "MANAGE_DOCUMENT_TYPES", PermissionName = "Manage Document Types", Category = "DOCUMENTS", Description = "Full access to create, update, list, and delete document types" },
            new Permission { PermissionCode = "MANAGE_CUSTOM_FIELDS", PermissionName = "Manage Custom Fields", Category = "CUSTOM_FIELDS", Description = "Full access to create, update, list, and delete custom fields" },
            new Permission { PermissionCode = "MANAGE_FILE_POLICIES", PermissionName = "Manage File & Retention Policies", Category = "POLICIES", Description = "Full access to manage file size, extensions, and retention rules" },
            new Permission { PermissionCode = "VIEW_AUDIT_LOGS", PermissionName = "View Audit Trail", Category = "AUDIT", Description = "Full access to view and download audit logs across all tenants" },
            new Permission { PermissionCode = "DOCUMENT_UPLOAD", PermissionName = "Upload Documents", Category = "DOCUMENTS", Description = "Ability to upload documents into any module" },
            new Permission { PermissionCode = "DOCUMENT_VIEW", PermissionName = "View Documents", Category = "DOCUMENTS", Description = "Ability to preview documents inline" },
            new Permission { PermissionCode = "DOCUMENT_DOWNLOAD", PermissionName = "Download Documents", Category = "DOCUMENTS", Description = "Ability to download document streams" },
            new Permission { PermissionCode = "DOCUMENT_DELETE", PermissionName = "Delete Documents", Category = "DOCUMENTS", Description = "Ability to soft-delete documents" },
            new Permission { PermissionCode = "DOCUMENT_RESTORE", PermissionName = "Restore Documents", Category = "DOCUMENTS", Description = "Ability to restore soft-deleted documents" },
            new Permission { PermissionCode = "MANAGE_CONFIG", PermissionName = "Manage System Configuration", Category = "CONFIG", Description = "Full access to system settings, SMTP, FCM, and JWT config" }
        };

        foreach (var p in defaultPermissions)
        {
            var existing = await dbContext.Permissions.FirstOrDefaultAsync(x => x.PermissionCode == p.PermissionCode);
            if (existing == null)
            {
                p.PublicId = Guid.NewGuid();
                p.IsActive = true;
                p.CreatedBy = 1;
                p.CreatedDate = DateTime.UtcNow;
                dbContext.Permissions.Add(p);
                await dbContext.SaveChangesAsync();
                existing = p;
            }

            if (!await dbContext.RolePermissions.AnyAsync(rp => rp.RoleId == superRole.Id && rp.PermissionId == existing.Id))
            {
                dbContext.RolePermissions.Add(new RolePermission
                {
                    PublicId = Guid.NewGuid(),
                    TenantId = superTenant.Id,
                    RoleId = superRole.Id,
                    PermissionId = existing.Id,
                    IsActive = true,
                    CreatedBy = 1,
                    CreatedDate = DateTime.UtcNow
                });
            }
        }
        await dbContext.SaveChangesAsync();

        // 4. Ensure Global Platform ConfigSettings (if missing)
        if (!await dbContext.ConfigSettings.AnyAsync())
        {
            var randomBytes = new byte[64];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomBytes);
            }
            var dynamicSecureJwtKey = Convert.ToBase64String(randomBytes);

            var globalSettings = new List<ConfigSetting>
            {
                // FIREBASE
                new ConfigSetting { SettingKey = "Firebase.EnablePushNotifications", SettingValue = "true", Category = "FIREBASE", DataType = "Boolean", Description = "Enable / Disable Firebase Push Notifications" },
                new ConfigSetting { SettingKey = "Firebase.ProjectId", SettingValue = "dms-platform-firebase", Category = "FIREBASE", DataType = "String", Description = "Firebase Project Console ID" },
                new ConfigSetting { SettingKey = "Firebase.ServerKey", SettingValue = "AAAA-FIREBASE-SERVER-KEY-MOCK-123456", Category = "FIREBASE", DataType = "Encrypted", Description = "Firebase FCM Server Key / OAuth Token" },
                new ConfigSetting { SettingKey = "Firebase.DefaultTopic", SettingValue = "dms-document-alerts", Category = "FIREBASE", DataType = "String", Description = "Default FCM Broadcast Topic Channel" },
                new ConfigSetting { SettingKey = "Firebase.FcmEndpoint", SettingValue = "https://fcm.googleapis.com/fcm/send", Category = "FIREBASE", DataType = "String", Description = "Google FCM Push Notification API Endpoint" },

                // SMTP
                new ConfigSetting { SettingKey = "SMTP.EnableEmailNotifications", SettingValue = "true", Category = "SMTP", DataType = "Boolean", Description = "Enable / Disable Email Notifications" },
                new ConfigSetting { SettingKey = "SMTP.Host", SettingValue = "smtp.gmail.com", Category = "SMTP", DataType = "String", Description = "SMTP Server Host Address" },
                new ConfigSetting { SettingKey = "SMTP.Port", SettingValue = "587", Category = "SMTP", DataType = "Number", Description = "SMTP Server TLS Port" },
                new ConfigSetting { SettingKey = "SMTP.Username", SettingValue = "notifications@dms-platform.com", Category = "SMTP", DataType = "String", Description = "SMTP Sender Username" },
                new ConfigSetting { SettingKey = "SMTP.Password", SettingValue = "app-password-secret-123", Category = "SMTP", DataType = "Encrypted", Description = "SMTP Account App Password" },
                new ConfigSetting { SettingKey = "SMTP.EnableSsl", SettingValue = "true", Category = "SMTP", DataType = "Boolean", Description = "Enable TLS/SSL Encryption" },
                new ConfigSetting { SettingKey = "SMTP.FromEmail", SettingValue = "noreply@dms-platform.com", Category = "SMTP", DataType = "String", Description = "Sender Display Email Address" },
                new ConfigSetting { SettingKey = "SMTP.FromName", SettingValue = "Antigravity DMS Platform", Category = "SMTP", DataType = "String", Description = "Sender Display Name" },

                // STORAGE
                new ConfigSetting { SettingKey = "Storage.DefaultProvider", SettingValue = "LOCAL", Category = "STORAGE", DataType = "String", Description = "System Default Storage Provider (LOCAL, AWS_S3, AZURE_BLOB)" },
                new ConfigSetting { SettingKey = "Storage.FolderPathPattern", SettingValue = "{TenantCode}/{Year}/{Month}/{Day}/{ModuleCode}/{EntityType}/{EntityId}", Category = "STORAGE", DataType = "String", Description = "Dynamic Storage Folder Path Pattern Template" },
                new ConfigSetting { SettingKey = "Storage.LocalBasePath", SettingValue = @"D:\DMS\DMS.Api\Storage", Category = "STORAGE", DataType = "String", Description = "Local File Storage Root Path" },
                new ConfigSetting { SettingKey = "Storage.MaxFileSizeBytes", SettingValue = "104857600", Category = "STORAGE", DataType = "Number", Description = "Default Max File Size (100MB)" },
                new ConfigSetting { SettingKey = "Storage.EnableChunkedUpload", SettingValue = "true", Category = "STORAGE", DataType = "Boolean", Description = "Enable Multipart Chunked File Upload" },
                new ConfigSetting { SettingKey = "Storage.ChunkSizeBytes", SettingValue = "5242880", Category = "STORAGE", DataType = "Number", Description = "Multipart Chunk Size (5MB)" },

                // SECURITY
                new ConfigSetting { SettingKey = "Security.AllowedExtensions", SettingValue = ".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.zip,.csv", Category = "SECURITY", DataType = "String", Description = "Global Allowed File Extensions" },
                new ConfigSetting { SettingKey = "Security.BlockedExtensions", SettingValue = ".exe,.bat,.cmd,.dll,.sh,.vbs,.scr", Category = "SECURITY", DataType = "String", Description = "Global Blocked File Extensions" },
                new ConfigSetting { SettingKey = "Security.EnableVirusScan", SettingValue = "false", Category = "SECURITY", DataType = "Boolean", Description = "Enable Anti-Virus File Scanner" },
                new ConfigSetting { SettingKey = "Security.ClamAvHost", SettingValue = "localhost", Category = "SECURITY", DataType = "String", Description = "ClamAV Anti-Virus Server Host" },
                new ConfigSetting { SettingKey = "Security.ClamAvPort", SettingValue = "3310", Category = "SECURITY", DataType = "Number", Description = "ClamAV Anti-Virus Server Port" },
                new ConfigSetting { SettingKey = "Security.MaxVersionsPerDocument", SettingValue = "10", Category = "SECURITY", DataType = "Number", Description = "Maximum Document Version History Retained" },

                // JWT
                new ConfigSetting { SettingKey = "Jwt.SecretKey", SettingValue = dynamicSecureJwtKey, Category = "JWT", DataType = "Encrypted", Description = "Global Cryptographically Generated JWT Signing Key" },
                new ConfigSetting { SettingKey = "Jwt.ExpiryMinutes", SettingValue = "480", Category = "JWT", DataType = "Number", Description = "JWT Token Expiry (8 Hours)" },
                new ConfigSetting { SettingKey = "Jwt.Issuer", SettingValue = "AntigravityDmsApi", Category = "JWT", DataType = "String", Description = "JWT Valid Token Issuer" },
                new ConfigSetting { SettingKey = "Jwt.Audience", SettingValue = "AntigravityDmsClients", Category = "JWT", DataType = "String", Description = "JWT Valid Token Audience" },

                // WEBHOOKS
                new ConfigSetting { SettingKey = "Webhooks.EnableWebhooks", SettingValue = "true", Category = "WEBHOOKS", DataType = "Boolean", Description = "Enable / Disable Real-Time Webhook Dispatching" },
                new ConfigSetting { SettingKey = "Webhooks.MaxRetryAttempts", SettingValue = "3", Category = "WEBHOOKS", DataType = "Number", Description = "Failed Webhook Maximum Retry Attempts" },
                new ConfigSetting { SettingKey = "Webhooks.RetryIntervalSeconds", SettingValue = "60", Category = "WEBHOOKS", DataType = "Number", Description = "Webhook Retry Backoff Interval Seconds" },

                // SYSTEM
                new ConfigSetting { SettingKey = "System.EnableAuditLogging", SettingValue = "true", Category = "SYSTEM", DataType = "Boolean", Description = "Enable / Disable Immutable Audit Logging" },
                new ConfigSetting { SettingKey = "System.MigrationPollIntervalSeconds", SettingValue = "5", Category = "SYSTEM", DataType = "Number", Description = "Storage Migration Worker Poll Interval" },
                new ConfigSetting { SettingKey = "System.CacheExpiryMinutes", SettingValue = "60", Category = "SYSTEM", DataType = "Number", Description = "System In-Memory Cache Expiry Duration" }
            };

            dbContext.ConfigSettings.AddRange(globalSettings);
            await dbContext.SaveChangesAsync();
        }
    }
}
