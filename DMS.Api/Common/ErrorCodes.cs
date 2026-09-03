namespace DMS.Api.Common;

public static class ErrorCodes
{
    public const string InvalidTenant = "DMS001";
    public const string InvalidApplication = "DMS002";
    public const string Unauthorized = "DMS003";
    public const string Forbidden = "DMS004";
    public const string DocumentNotFound = "DMS005";
    public const string StorageUnavailable = "DMS006";
    public const string UploadFailed = "DMS007";
    public const string DownloadFailed = "DMS008";
    public const string InvalidFile = "DMS009";
    public const string DuplicateRequest = "DMS010";
    public const string StorageMigrationFailed = "DMS011";
    public const string StorageConfigurationInvalid = "DMS012";
    public const string PermissionDenied = "DMS013";
    public const string InvalidInput = "DMS014";
    public const string UserNotFound = "DMS015";
    public const string MandatoryDocumentMissing = "DMS030";
}
