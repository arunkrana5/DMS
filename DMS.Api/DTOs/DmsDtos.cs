using DMS.Api.Common;

namespace DMS.Api.DTOs;

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageIndex { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

public class LoginRequest
{
    public string TenantCode { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class DiscoverTenantRequest
{
    public string Identifier { get; set; } = string.Empty;
}

public class DiscoverTenantResponse
{
    public bool RequiresTenantSelect { get; set; }
    public string DefaultTenantCode { get; set; } = string.Empty;
    public List<TenantOptionDto> Tenants { get; set; } = new();
}

public class TenantOptionDto
{
    public string TenantCode { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string TenantCode { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
    public List<string> Permissions { get; set; } = new();
}

public class UploadDocumentRequest
{
    public int? TenantId { get; set; }
    public int? ApplicationId { get; set; }
    public string? ModuleCode { get; set; }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public int? FolderId { get; set; }
    public string? FolderKey { get; set; }
    public int? DocumentTypeId { get; set; }
    public string? DocumentTypeCode { get; set; }
    public string? Description { get; set; }
}

public class UpdateDocumentRequest
{
    public string? FileName { get; set; }
    public string? ModuleCode { get; set; }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string? Description { get; set; }
}

public class BulkRegisterItemRequest
{
    public string FileName { get; set; } = string.Empty;
    public string StorageObjectKey { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long FileSize { get; set; }
    public string? Extension { get; set; }
    public int? ApplicationId { get; set; }
    public string? ModuleCode { get; set; }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public int? FolderId { get; set; }
    public int? DocumentTypeId { get; set; }
    public int? StorageProfileId { get; set; }
    public string? Description { get; set; }
}

public class DocumentSearchRequest
{
    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public int? ApplicationId { get; set; }
    public string? ModuleCode { get; set; }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public int? FolderId { get; set; }
    public int? DocumentTypeId { get; set; }
    public string? SearchTerm { get; set; }
}

public class DocumentDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public string DownloadUrl { get; set; } = string.Empty;
    public string PreviewUrl { get; set; } = string.Empty;
    public string FullPhysicalPath { get; set; } = string.Empty;
    public int TenantId { get; set; }
    public int? ApplicationId { get; set; }
    public string? ModuleCode { get; set; }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public int? FolderId { get; set; }
    public string StorageObjectKey { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string Extension { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public int? DocumentTypeId { get; set; }
    public string? DocumentTypeCode { get; set; }
    public string? DocumentTypeName { get; set; }
    public string ProviderCode { get; set; } = string.Empty;
    public string StorageProfileName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int CurrentVersion { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime UploadedOn { get; set; }
    public string UploadedByName { get; set; } = "System Administrator";
    public string? CreatedByName { get; set; }
    public List<DocumentVersionDto> Versions { get; set; } = new();
}

public class DocumentVersionDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public int VersionNumber { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public DateTime UploadedOn { get; set; }
    public bool IsCurrent { get; set; }
}

public class CreateFolderRequest
{
    public int? TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? ParentFolderId { get; set; }
    public int? ApplicationId { get; set; }
    public string? ModuleCode { get; set; }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
}

public class UpdateFolderRequest
{
    public string Name { get; set; } = string.Empty;
    public string? ModuleCode { get; set; }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
}

public class FolderDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public int TenantId { get; set; }
    public int? ApplicationId { get; set; }
    public string? ModuleCode { get; set; }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string FolderPath { get; set; } = string.Empty;
    public int? ParentFolderId { get; set; }
    public int DocumentCount { get; set; }
    public int SubFolderCount { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class ApplicationDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string ApplicationCode { get; set; } = string.Empty;
    public string ApplicationName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class CreateApplicationRequest
{
    public int? TenantId { get; set; }
    public string ApplicationCode { get; set; } = string.Empty;
    public string ApplicationName { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class DocumentTypeDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string TypeCode { get; set; } = string.Empty;
    public string TypeName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ModuleCode { get; set; }
    public string? AllowedExtensions { get; set; }
    public long? MaxFileSizeBytes { get; set; }
    public bool IsMandatory { get; set; }
    public bool IsActive { get; set; }
}

public class CreateDocumentTypeRequest
{
    public int? TenantId { get; set; }
    public string TypeCode { get; set; } = string.Empty;
    public string TypeName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ModuleCode { get; set; }
    public string? AllowedExtensions { get; set; }
    public long? MaxFileSizeBytes { get; set; }
    public bool IsMandatory { get; set; } = false;
}

public class UpdateDocumentTypeRequest
{
    public string TypeName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ModuleCode { get; set; }
    public string? AllowedExtensions { get; set; }
    public long? MaxFileSizeBytes { get; set; }
    public bool IsMandatory { get; set; } = false;
    public bool IsActive { get; set; } = true;
}

public class WebhookDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class CreateWebhookRequest
{
    public int? TenantId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    public string? SecretKey { get; set; }
}

public class UpdateWebhookRequest
{
    public string EventType { get; set; } = string.Empty;
    public string Endpoint { get; set; } = string.Empty;
    public string? SecretKey { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreateStorageProfileRequest
{
    public int? TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ProviderCode { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public string? ConfigurationJson { get; set; }
}

public class StorageProfileDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public int TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ProviderCode { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public string ConfigurationJson { get; set; } = "{}";
}

public class StorageRoutingRuleDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public int TenantId { get; set; }
    public int? ApplicationId { get; set; }
    public string? ApplicationCode { get; set; }
    public string? ApplicationName { get; set; }
    public string? ModuleCode { get; set; }
    public string? EntityType { get; set; }
    public int? DocumentTypeId { get; set; }
    public string? DocumentTypeName { get; set; }
    public int StorageProfileId { get; set; }
    public string StorageProfileName { get; set; } = string.Empty;
    public int Priority { get; set; }
    public bool IsActive { get; set; }
}

public class CreateStorageRoutingRuleRequest
{
    public int? TenantId { get; set; }
    public int? ApplicationId { get; set; }
    public string? ModuleCode { get; set; }
    public string? EntityType { get; set; }
    public int? DocumentTypeId { get; set; }
    public int StorageProfileId { get; set; }
    public int? Priority { get; set; }
}

public class AuditLogDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public int TenantId { get; set; }
    public int? ApplicationId { get; set; }
    public int UserId { get; set; }
    public int? DocumentId { get; set; }
    public Guid? DocumentPublicId { get; set; }
    public string? DocumentName { get; set; }
    public string Action { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    public string? IPAddress { get; set; }
    public string? ProviderCode { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedDate { get; set; }
}

public class RoleDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public int TenantId { get; set; }
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public List<int> PermissionIds { get; set; } = new();
    public List<string> PermissionCodes { get; set; } = new();
    public DateTime CreatedDate { get; set; }
}

public class PermissionDto
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public string PermissionCode { get; set; } = string.Empty;
    public string PermissionName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class CreateRoleRequest
{
    public int? TenantId { get; set; }
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<int> PermissionIds { get; set; } = new();
}

public class UpdateRoleRequest
{
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public List<int> PermissionIds { get; set; } = new();
}

public class DashboardStatsDto
{
    public int TotalDocuments { get; set; }
    public long TotalStorageBytes { get; set; }
    public int TotalApplications { get; set; }
    public int ActiveUsers { get; set; }
    public int UploadsToday { get; set; }
    public int DownloadsToday { get; set; }
    public int FailedOperations { get; set; }
    public string StorageHealth { get; set; } = "Healthy";
}

public class BulkUploadResultDto
{
    public int TotalSubmitted { get; set; }
    public int TotalSucceeded { get; set; }
    public int TotalFailed { get; set; }
    public List<BulkUploadItemResult> Results { get; set; } = new();
}

public class BulkUploadItemResult
{
    public string FileName { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public Guid? PublicId { get; set; }
    public DocumentDto? Document { get; set; }
}

public class BatchUploadRequest
{
    public int? TenantId { get; set; }
    public int? ApplicationId { get; set; }
    public string? ApplicationCode { get; set; }
    public string? ModuleCode { get; set; }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string? Description { get; set; }
    public List<string>? DocumentTypeCodes { get; set; }
    public List<Microsoft.AspNetCore.Http.IFormFile>? Files { get; set; }
}

public class TenantModuleDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string ModuleCode { get; set; } = string.Empty;
    public string ModuleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}

public class CreateTenantModuleRequest
{
    public int? TenantId { get; set; }
    public string ModuleCode { get; set; } = string.Empty;
    public string ModuleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; } = 0;
}

public class UpdateTenantModuleRequest
{
    public string ModuleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}

public class ModuleDocumentTypeDto
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string ModuleCode { get; set; } = string.Empty;
    public int DocumentTypeId { get; set; }
    public string DocumentTypeCode { get; set; } = string.Empty;
    public string DocumentTypeName { get; set; } = string.Empty;
    public bool IsMandatory { get; set; }
    public int MaxAllowedFiles { get; set; }
    public int DisplayOrder { get; set; }
}

public class ConfigureModuleDocumentTypeRequest
{
    public string ModuleCode { get; set; } = string.Empty;
    public int DocumentTypeId { get; set; }
    public bool IsMandatory { get; set; }
    public int MaxAllowedFiles { get; set; } = 10;
    public int DisplayOrder { get; set; } = 0;
}
