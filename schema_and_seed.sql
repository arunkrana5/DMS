-- ============================================================================
-- Enterprise Multi-Tenant DMS - Complete Database Schema & Master Seed Script
-- Created for: SQL Server / Azure SQL
-- Usage: Run this script to recreate tables and populate initial master data
-- ============================================================================

SET NOCOUNT ON;
GO

-- 1. TENANTS TABLE
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Tenants')
BEGIN
    CREATE TABLE [dbo].[Tenants] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PublicId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [TenantCode] NVARCHAR(50) NOT NULL UNIQUE,
        [TenantName] NVARCHAR(200) NOT NULL,
        [Description] NVARCHAR(500) NULL,
        [ContactEmail] NVARCHAR(255) NULL,
        [PrimaryColor] NVARCHAR(50) NULL DEFAULT '#2563eb',
        [LogoUrl] NVARCHAR(500) NULL,
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
GO

-- 2. ROLES TABLE
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
BEGIN
    CREATE TABLE [dbo].[Roles] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PublicId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [TenantId] INT NOT NULL FOREIGN KEY REFERENCES [Tenants]([Id]),
        [RoleCode] NVARCHAR(50) NOT NULL,
        [RoleName] NVARCHAR(100) NOT NULL,
        [Description] NVARCHAR(500) NULL,
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
GO

-- 3. USERS TABLE
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE [dbo].[Users] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PublicId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [TenantId] INT NOT NULL FOREIGN KEY REFERENCES [Tenants]([Id]),
        [Username] NVARCHAR(100) NOT NULL,
        [Email] NVARCHAR(255) NOT NULL,
        [PasswordHash] NVARCHAR(500) NOT NULL,
        [FullName] NVARCHAR(200) NOT NULL,
        [RoleId] INT NULL FOREIGN KEY REFERENCES [Roles]([Id]),
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
GO

-- 4. PERMISSIONS TABLE
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Permissions')
BEGIN
    CREATE TABLE [dbo].[Permissions] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PublicId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [PermissionCode] NVARCHAR(50) NOT NULL UNIQUE,
        [PermissionName] NVARCHAR(100) NOT NULL,
        [Category] NVARCHAR(50) NOT NULL,
        [Description] NVARCHAR(500) NULL,
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
GO

-- 5. ROLE PERMISSIONS TABLE
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RolePermissions')
BEGIN
    CREATE TABLE [dbo].[RolePermissions] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PublicId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [TenantId] INT NOT NULL FOREIGN KEY REFERENCES [Tenants]([Id]),
        [RoleId] INT NOT NULL FOREIGN KEY REFERENCES [Roles]([Id]),
        [PermissionId] INT NOT NULL FOREIGN KEY REFERENCES [Permissions]([Id]),
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
GO

-- 6. STORAGE PROFILES TABLE
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StorageProfiles')
BEGIN
    CREATE TABLE [dbo].[StorageProfiles] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PublicId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [TenantId] INT NOT NULL FOREIGN KEY REFERENCES [Tenants]([Id]),
        [Name] NVARCHAR(150) NOT NULL,
        [ProviderCode] NVARCHAR(50) NOT NULL DEFAULT 'LOCAL',
        [IsDefault] BIT NOT NULL DEFAULT 0,
        [ConfigurationJsonEncrypted] NVARCHAR(MAX) NULL,
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
GO

-- 7. CONFIG SETTINGS TABLE
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ConfigSettings')
BEGIN
    CREATE TABLE [dbo].[ConfigSettings] (
        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [PublicId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [TenantId] INT NULL FOREIGN KEY REFERENCES [Tenants]([Id]),
        [ApplicationId] INT NULL,
        [Category] NVARCHAR(50) NOT NULL,
        [SettingKey] NVARCHAR(100) NOT NULL,
        [SettingValue] NVARCHAR(MAX) NULL,
        [DataType] NVARCHAR(50) NOT NULL DEFAULT 'String',
        [IsEncrypted] BIT NOT NULL DEFAULT 0,
        [Description] NVARCHAR(500) NULL,
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
GO

-- 8. NOTIFICATIONS TABLE
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
GO

-- ============================================================================
-- MASTER DATA SEED INSERTS (Optional: Run after TRUNCATE / DB RESET)
-- ============================================================================

-- 1. SUPERADMIN Tenant
IF NOT EXISTS (SELECT * FROM [Tenants] WHERE [TenantCode] = 'SUPERADMIN')
BEGIN
    INSERT INTO [Tenants] ([PublicId], [TenantCode], [TenantName], [Description], [ContactEmail], [PrimaryColor], [IsActive], [CreatedDate])
    VALUES (NEWID(), 'SUPERADMIN', 'Platform Super Administrator', 'Global Platform Management', 'superadmin@dms.platform', '#4F46E5', 1, GETUTCDATE());
END

-- 2. EKARGAR Tenant
IF NOT EXISTS (SELECT * FROM [Tenants] WHERE [TenantCode] = 'EKARGAR')
BEGIN
    INSERT INTO [Tenants] ([PublicId], [TenantCode], [TenantName], [Description], [ContactEmail], [PrimaryColor], [IsActive], [CreatedDate])
    VALUES (NEWID(), 'EKARGAR', 'eKargar Client Enterprise', 'eKargar Enterprise Client Account', 'arun.kumar@ekargar.in', '#93387a', 1, GETUTCDATE());
END

DECLARE @SuperTenantId INT = (SELECT Id FROM [Tenants] WHERE [TenantCode] = 'SUPERADMIN');
DECLARE @EkargarTenantId INT = (SELECT Id FROM [Tenants] WHERE [TenantCode] = 'EKARGAR');

-- 3. Roles
IF NOT EXISTS (SELECT * FROM [Roles] WHERE [TenantId] = @SuperTenantId AND [RoleCode] = 'SUPERADMIN')
BEGIN
    INSERT INTO [Roles] ([PublicId], [TenantId], [RoleCode], [RoleName], [Description], [IsActive], [CreatedDate])
    VALUES (NEWID(), @SuperTenantId, 'SUPERADMIN', 'Super Administrator', 'Global System Super Administrator', 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT * FROM [Roles] WHERE [TenantId] = @EkargarTenantId AND [RoleCode] = 'EKARGAR_ADMIN')
BEGIN
    INSERT INTO [Roles] ([PublicId], [TenantId], [RoleCode], [RoleName], [Description], [IsActive], [CreatedDate])
    VALUES (NEWID(), @EkargarTenantId, 'EKARGAR_ADMIN', 'eKargar Admin', 'eKargar Client Administrator', 1, GETUTCDATE());
END

DECLARE @SuperRoleId INT = (SELECT Id FROM [Roles] WHERE [TenantId] = @SuperTenantId AND [RoleCode] = 'SUPERADMIN');
DECLARE @EkargarRoleId INT = (SELECT Id FROM [Roles] WHERE [TenantId] = @EkargarTenantId AND [RoleCode] = 'EKARGAR_ADMIN');

-- 4. Users
IF NOT EXISTS (SELECT * FROM [Users] WHERE [TenantId] = @SuperTenantId AND [Username] = 'superadmin')
BEGIN
    INSERT INTO [Users] ([PublicId], [TenantId], [Username], [Email], [PasswordHash], [FullName], [RoleId], [IsActive], [CreatedDate])
    VALUES (NEWID(), @SuperTenantId, 'superadmin', 'superadmin@dms.platform', 'SuperAdmin123!', 'Platform Super Administrator', @SuperRoleId, 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT * FROM [Users] WHERE [TenantId] = @EkargarTenantId AND [Email] = 'arun.kumar@ekargar.in')
BEGIN
    INSERT INTO [Users] ([PublicId], [TenantId], [Username], [Email], [PasswordHash], [FullName], [RoleId], [IsActive], [CreatedDate])
    VALUES (NEWID(), @EkargarTenantId, 'arun.kumar@ekargar.in', 'arun.kumar@ekargar.in', 'Ekargar123!', 'Arun Kumar', @EkargarRoleId, 1, GETUTCDATE());
END

-- 5. Storage Profiles
IF NOT EXISTS (SELECT * FROM [StorageProfiles] WHERE [TenantId] = @SuperTenantId)
BEGIN
    INSERT INTO [StorageProfiles] ([PublicId], [TenantId], [Name], [ProviderCode], [IsDefault], [ConfigurationJsonEncrypted], [IsActive], [CreatedDate])
    VALUES (NEWID(), @SuperTenantId, 'Platform SuperAdmin Default Storage', 'LOCAL', 1, '{}', 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT * FROM [StorageProfiles] WHERE [TenantId] = @EkargarTenantId)
BEGIN
    INSERT INTO [StorageProfiles] ([PublicId], [TenantId], [Name], [ProviderCode], [IsDefault], [ConfigurationJsonEncrypted], [IsActive], [CreatedDate])
    VALUES (NEWID(), @EkargarTenantId, 'eKargar Default Storage', 'LOCAL', 1, '{}', 1, GETUTCDATE());
END

-- 6. Permissions
INSERT INTO [Permissions] ([PublicId], [PermissionCode], [PermissionName], [Category], [Description], [IsActive], [CreatedDate])
SELECT NEWID(), Code, Name, Cat, Descrip, 1, GETUTCDATE()
FROM (VALUES 
    ('MANAGE_TENANTS', 'Manage Tenants', 'TENANTS', 'Full access to create, update, list, and delete tenants'),
    ('MANAGE_USERS', 'Manage Users', 'USERS', 'Full access to create, update, list, and delete users'),
    ('MANAGE_ROLES', 'Manage Roles & Permissions', 'ROLES', 'Full access to create, update, list, delete roles and assign permissions'),
    ('MANAGE_APPLICATIONS', 'Manage Applications', 'APPLICATIONS', 'Full access to register, update, list, and delete applications'),
    ('MANAGE_STORAGE_PROFILES', 'Manage Storage Profiles', 'STORAGE', 'Full access to create, update, list, and delete storage profiles'),
    ('MANAGE_DOCUMENT_TYPES', 'Manage Document Types', 'DOCUMENTS', 'Full access to create, update, list, and delete document types'),
    ('MANAGE_CUSTOM_FIELDS', 'Manage Custom Fields', 'CUSTOM_FIELDS', 'Full access to create, update, list, and delete custom fields'),
    ('MANAGE_FILE_POLICIES', 'Manage File & Retention Policies', 'POLICIES', 'Full access to manage file size, extensions, and retention rules'),
    ('VIEW_AUDIT_LOGS', 'View Audit Trail', 'AUDIT', 'Full access to view and download audit logs across all tenants'),
    ('DOCUMENT_UPLOAD', 'Upload Documents', 'DOCUMENTS', 'Ability to upload documents into any module'),
    ('DOCUMENT_VIEW', 'View Documents', 'DOCUMENTS', 'Ability to preview documents inline'),
    ('DOCUMENT_DOWNLOAD', 'Download Documents', 'DOCUMENTS', 'Ability to download document streams'),
    ('DOCUMENT_DELETE', 'Delete Documents', 'DOCUMENTS', 'Ability to soft-delete documents'),
    ('DOCUMENT_RESTORE', 'Restore Documents', 'DOCUMENTS', 'Ability to restore soft-deleted documents'),
    ('MANAGE_CONFIG', 'Manage System Configuration', 'CONFIG', 'Full access to system settings, SMTP, FCM, and JWT config')
) AS Source(Code, Name, Cat, Descrip)
WHERE NOT EXISTS (SELECT 1 FROM [Permissions] WHERE [PermissionCode] = Source.Code);

-- Map Permissions to SUPERADMIN & EKARGAR_ADMIN
INSERT INTO [RolePermissions] ([PublicId], [TenantId], [RoleId], [PermissionId], [IsActive], [CreatedDate])
SELECT NEWID(), @SuperTenantId, @SuperRoleId, p.Id, 1, GETUTCDATE()
FROM [Permissions] p
WHERE NOT EXISTS (SELECT 1 FROM [RolePermissions] WHERE [RoleId] = @SuperRoleId AND [PermissionId] = p.Id);

INSERT INTO [RolePermissions] ([PublicId], [TenantId], [RoleId], [PermissionId], [IsActive], [CreatedDate])
SELECT NEWID(), @EkargarTenantId, @EkargarRoleId, p.Id, 1, GETUTCDATE()
FROM [Permissions] p
WHERE NOT EXISTS (SELECT 1 FROM [RolePermissions] WHERE [RoleId] = @EkargarRoleId AND [PermissionId] = p.Id);

PRINT 'Enterprise Multi-Tenant DMS Schema & Master Seed Script Executed Successfully!';
GO
