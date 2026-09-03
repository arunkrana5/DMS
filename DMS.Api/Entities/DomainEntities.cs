using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DMS.Api.Entities;

public class Tenant : BaseEntity
{
    [Required, MaxLength(50)]
    public string TenantCode { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string TenantName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public string? ContactEmail { get; set; }
    public string? PrimaryColor { get; set; }
    public string? LogoUrl { get; set; }

    public ICollection<Application> Applications { get; set; } = new List<Application>();
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<StorageProfile> StorageProfiles { get; set; } = new List<StorageProfile>();
}

public class Application : BaseEntity
{
    public int TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    [Required, MaxLength(50)]
    public string ApplicationCode { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string ApplicationName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public ICollection<ApiClient> ApiClients { get; set; } = new List<ApiClient>();
}

public class ApiClient : BaseEntity
{
    public int TenantId { get; set; }
    public int ApplicationId { get; set; }
    public Application? Application { get; set; }

    [Required, MaxLength(100)]
    public string ClientId { get; set; } = string.Empty;

    [Required]
    public string ClientSecretHash { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ClientName { get; set; } = string.Empty;

    public DateTime? LastUsedAt { get; set; }
}

public class User : BaseEntity
{
    public int TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    [Required, MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    public int? RoleId { get; set; }
    public Role? Role { get; set; }
}

public class Role : BaseEntity
{
    public int TenantId { get; set; }

    [Required, MaxLength(50)]
    public string RoleCode { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string RoleName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class Permission : BaseEntity
{
    [Required, MaxLength(50)]
    public string PermissionCode { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string PermissionName { get; set; } = string.Empty;

    public string? Category { get; set; }
    public string? Description { get; set; }
}

public class RolePermission : BaseEntity
{
    public int TenantId { get; set; }
    public int RoleId { get; set; }
    public Role? Role { get; set; }

    public int PermissionId { get; set; }
    public Permission? Permission { get; set; }
}

public class Folder : BaseEntity
{
    public int TenantId { get; set; }
    public int? ApplicationId { get; set; }

    [MaxLength(50)]
    public string? ModuleCode { get; set; }

    [MaxLength(50)]
    public string? EntityType { get; set; }

    [MaxLength(100)]
    public string? EntityId { get; set; }

    public int? ParentFolderId { get; set; }
    public Folder? ParentFolder { get; set; }

    public int? StorageProfileId { get; set; }
    public StorageProfile? StorageProfile { get; set; }

    [MaxLength(500)]
    public string? StorageFolderKey { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public ICollection<Folder> SubFolders { get; set; } = new List<Folder>();
    public ICollection<Document> Documents { get; set; } = new List<Document>();
}

public class Document : BaseEntity
{
    public int TenantId { get; set; }
    public int? ApplicationId { get; set; }

    [MaxLength(50)]
    public string? ModuleCode { get; set; }

    [MaxLength(50)]
    public string? EntityType { get; set; }

    [MaxLength(100)]
    public string? EntityId { get; set; }

    public int? FolderId { get; set; }
    public Folder? Folder { get; set; }

    public int StorageProfileId { get; set; }
    public StorageProfile? StorageProfile { get; set; }

    [Required, MaxLength(500)]
    public string StorageObjectKey { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string OriginalFileName { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Extension { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ContentType { get; set; } = "application/octet-stream";

    public long FileSize { get; set; }

    public int? DocumentTypeId { get; set; }
    public DocumentType? DocumentType { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    public int CurrentVersion { get; set; } = 1;

    [MaxLength(50)]
    public string Status { get; set; } = "Active";

    public int UploadedBy { get; set; }
    public DateTime UploadedOn { get; set; } = DateTime.UtcNow;

    public ICollection<DocumentVersion> Versions { get; set; } = new List<DocumentVersion>();
    public ICollection<DocumentCustomFieldValue> CustomFieldValues { get; set; } = new List<DocumentCustomFieldValue>();
    public ICollection<DocumentTag> DocumentTags { get; set; } = new List<DocumentTag>();
}

public class DocumentVersion : BaseEntity
{
    public int TenantId { get; set; }
    public int DocumentId { get; set; }
    public Document? Document { get; set; }

    public int VersionNumber { get; set; }

    public int StorageProfileId { get; set; }
    public StorageProfile? StorageProfile { get; set; }

    [Required, MaxLength(500)]
    public string StorageObjectKey { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    public long FileSize { get; set; }

    [MaxLength(100)]
    public string ContentType { get; set; } = "application/octet-stream";

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public int UploadedBy { get; set; }
    public DateTime UploadedOn { get; set; } = DateTime.UtcNow;

    public bool IsCurrent { get; set; } = false;
}

public class StorageProfile : BaseEntity
{
    public int TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string ProviderCode { get; set; } = "LOCAL"; // LOCAL, AWS_S3, AZURE_BLOB, GOOGLE_DRIVE, ONEDRIVE, SHAREPOINT, LOCAL_AGENT

    public bool IsDefault { get; set; } = false;

    public string ConfigurationJsonEncrypted { get; set; } = "{}";
}

public class StorageRoutingRule : BaseEntity
{
    public int TenantId { get; set; }
    public int? ApplicationId { get; set; }
    public Application? Application { get; set; }

    [MaxLength(50)]
    public string? ModuleCode { get; set; }

    [MaxLength(50)]
    public string? EntityType { get; set; }

    public int? DocumentTypeId { get; set; }
    public DocumentType? DocumentType { get; set; }

    public int StorageProfileId { get; set; }
    public StorageProfile? StorageProfile { get; set; }
}

public class StorageMigrationJob : BaseEntity
{
    public int TenantId { get; set; }
    public int DocumentId { get; set; }
    public Document? Document { get; set; }

    public int SourceStorageProfileId { get; set; }
    public int DestinationStorageProfileId { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "Pending"; // Pending, InProgress, Completed, Failed, Retrying

    public int ProgressPercentage { get; set; } = 0;

    public string? ErrorMessage { get; set; }
    public bool RemoveSourceOnSuccess { get; set; } = false;
}

public class DocumentType : BaseEntity
{
    public int TenantId { get; set; }

    [Required, MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(50)]
    public string? ModuleCode { get; set; }

    [MaxLength(255)]
    public string AllowedExtensions { get; set; } = ".pdf,.docx,.jpg,.png";

    public long MaxFileSize { get; set; } = 104857600; // 100MB
    public bool IsMandatory { get; set; } = false;
    public bool IsRequired { get => IsMandatory; set => IsMandatory = value; }
}

public class TenantModule : BaseEntity
{
    public int TenantId { get; set; }

    [Required, MaxLength(50)]
    public string ModuleCode { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string ModuleName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public int DisplayOrder { get; set; } = 0;
}

public class ModuleDocumentType : BaseEntity
{
    public int TenantId { get; set; }

    [Required, MaxLength(50)]
    public string ModuleCode { get; set; } = string.Empty;

    public int DocumentTypeId { get; set; }
    public DocumentType? DocumentType { get; set; }

    public bool IsMandatory { get; set; } = false;
    public int MaxAllowedFiles { get; set; } = 10;
    public int DisplayOrder { get; set; } = 0;

    [MaxLength(255)]
    public string? AllowedExtensionsOverride { get; set; }
    public long? MaxFileSizeBytesOverride { get; set; }
}

public class CustomField : BaseEntity
{
    public int TenantId { get; set; }

    [Required, MaxLength(50)]
    public string FieldCode { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string FieldName { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string DataType { get; set; } = "Text"; // Text, Number, Date, Boolean, Dropdown, MultiSelect

    public bool IsRequired { get; set; } = false;
    public bool IsSearchable { get; set; } = true;
    public string? OptionsJson { get; set; } // JSON array for Dropdown options
}

public class DocumentCustomFieldValue : BaseEntity
{
    public int DocumentId { get; set; }
    public Document? Document { get; set; }

    public int CustomFieldId { get; set; }
    public CustomField? CustomField { get; set; }

    public string? Value { get; set; }
}

public class Tag : BaseEntity
{
    public int TenantId { get; set; }

    [Required, MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(10)]
    public string Color { get; set; } = "#3B82F6";
}

public class DocumentTag : BaseEntity
{
    public int DocumentId { get; set; }
    public Document? Document { get; set; }

    public int TagId { get; set; }
    public Tag? Tag { get; set; }
}

public class DocumentPermission : BaseEntity
{
    public int TenantId { get; set; }
    public int DocumentId { get; set; }
    public Document? Document { get; set; }

    public int? UserId { get; set; }
    public int? RoleId { get; set; }

    public bool CanView { get; set; } = true;
    public bool CanDownload { get; set; } = true;
    public bool CanEdit { get; set; } = false;
    public bool CanDelete { get; set; } = false;
    public bool CanShare { get; set; } = false;
}

public class FolderPermission : BaseEntity
{
    public int TenantId { get; set; }
    public int FolderId { get; set; }
    public Folder? Folder { get; set; }

    public int? UserId { get; set; }
    public int? RoleId { get; set; }

    public bool CanView { get; set; } = true;
    public bool CanUpload { get; set; } = true;
    public bool CanEdit { get; set; } = false;
    public bool CanDelete { get; set; } = false;
}

public class TenantFilePolicy : BaseEntity
{
    public int TenantId { get; set; }

    public long MaxFileSize { get; set; } = 104857600; // 100 MB default
    public string AllowedExtensions { get; set; } = ".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.zip";
    public string BlockedExtensions { get; set; } = ".exe,.bat,.cmd,.dll,.sh,.vbs,.scr";
    public string AllowedContentTypes { get; set; } = "application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    public bool EnableVirusScanning { get; set; } = false;
    public bool EnableVersioning { get; set; } = true;
    public int MaxVersions { get; set; } = 10;
    public bool EnablePreview { get; set; } = true;
}

public class RetentionPolicy : BaseEntity
{
    public int TenantId { get; set; }

    [Required, MaxLength(100)]
    public string PolicyName { get; set; } = string.Empty;

    public int? DocumentTypeId { get; set; }

    public int RetentionDays { get; set; } = 365;

    [Required, MaxLength(50)]
    public string Action { get; set; } = "Archive"; // Archive, MoveStorage, SoftDelete, PermanentDelete

    public int? TargetStorageProfileId { get; set; }
}

public class AuditLog : BaseEntity
{
    public int TenantId { get; set; }
    public int? ApplicationId { get; set; }
    public int UserId { get; set; }
    public int? DocumentId { get; set; }
    public Document? Document { get; set; }

    [Required, MaxLength(50)]
    public string Action { get; set; } = string.Empty; // LOGIN, UPLOAD, DOWNLOAD, PREVIEW, DELETE, RESTORE, MOVE, SHARE, MIGRATION

    [MaxLength(100)]
    public string UserAgent { get; set; } = "Unknown";

    [MaxLength(50)]
    public string? StorageProvider { get; set; }

    [MaxLength(1000)]
    public string? Remarks { get; set; }
}

public class IdempotencyKey : BaseEntity
{
    public int TenantId { get; set; }
    public int? ApplicationId { get; set; }

    [Required, MaxLength(100)]
    public string Key { get; set; } = string.Empty;

    [Required, MaxLength(128)]
    public string RequestHash { get; set; } = string.Empty;

    public int DocumentId { get; set; }
}

public class Webhook : BaseEntity
{
    public int TenantId { get; set; }
    public int? ApplicationId { get; set; }

    [Required, MaxLength(50)]
    public string EventType { get; set; } = string.Empty; // DocumentUploaded, DocumentDeleted, DocumentVersionCreated, etc.

    [Required, MaxLength(500)]
    public string Endpoint { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string SecretReference { get; set; } = string.Empty;
}

public class WebhookDelivery : BaseEntity
{
    public int WebhookId { get; set; }
    public Webhook? Webhook { get; set; }

    [Required, MaxLength(50)]
    public string EventType { get; set; } = string.Empty;

    public string PayloadJson { get; set; } = "{}";
    public int ResponseStatusCode { get; set; }
    public string? ResponseBody { get; set; }
    public bool IsSuccess { get; set; }
    public int AttemptCount { get; set; } = 1;
}

public class ConfigSetting : BaseEntity
{
    public int? TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public int? ApplicationId { get; set; }
    public Application? Application { get; set; }

    [Required, MaxLength(50)]
    public string Category { get; set; } = "SYSTEM"; // SYSTEM, JWT, STORAGE, SECURITY, VIRUS_SCANNER

    [Required, MaxLength(100)]
    public string SettingKey { get; set; } = string.Empty;

    public string? SettingValue { get; set; }

    [Required, MaxLength(50)]
    public string DataType { get; set; } = "String"; // String, Number, Boolean, Json, Encrypted

    public bool IsEncrypted { get; set; } = false;

    [MaxLength(500)]
    public string? Description { get; set; }
}

public class Notification : BaseEntity
{
    public int TenantId { get; set; }
    public int? UserId { get; set; }
    public int? DocumentId { get; set; }

    [Required, MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(1000)]
    public string Message { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string NotificationType { get; set; } = "FCM_PUSH"; // FCM_PUSH, WEBHOOK, EMAIL, SYSTEM

    public string? DataJson { get; set; } = "{}";
    public bool IsRead { get; set; } = false;

    [MaxLength(50)]
    public string Status { get; set; } = "Sent"; // Sent, Failed, Pending
}
