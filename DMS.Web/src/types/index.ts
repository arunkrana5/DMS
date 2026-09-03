export interface User {
  userId: number;
  username: string;
  email: string;
  tenantCode?: string;
  roles: string[];
  permissions: string[];
}

export interface Tenant {
  tenantCode: string;
  tenantName: string;
  primaryColor?: string;
}

export interface DocumentVersion {
  publicId: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  remarks?: string;
  uploadedOn: string;
  isCurrent: boolean;
}

export interface DocumentItem {
  id?: number;
  publicId: string;
  downloadUrl?: string;
  previewUrl?: string;
  storageObjectKey?: string;
  fullPhysicalPath?: string;
  tenantId: number;
  applicationId?: number;
  moduleCode?: string;
  entityType?: string;
  entityId?: string;
  folderId?: number;
  fileName: string;
  originalFileName: string;
  extension: string;
  contentType: string;
  fileSize: number;
  currentVersion: number;
  status: string;
  uploadedOn: string;
  storageProfileName: string;
  providerCode: string;
  documentTypeId?: number;
  documentTypeCode?: string;
  documentTypeName?: string;
  description?: string;
  versions: DocumentVersion[];
}

export interface FolderItem {
  id: number;
  publicId: string;
  tenantId: number;
  applicationId?: number;
  moduleCode?: string;
  entityType?: string;
  entityId?: string;
  parentFolderId?: number;
  name: string;
  createdDate: string;
  subFolderCount: number;
  documentCount: number;
}

export interface StorageProfile {
  id: number;
  publicId: string;
  tenantId: number;
  name: string;
  providerCode: string;
  isDefault: boolean;
  isActive: boolean;
  configurationJson: string;
}

export interface AuditLogItem {
  id: number;
  publicId?: string;
  tenantId: number;
  applicationId?: number;
  userId: number;
  documentId?: number;
  documentPublicId?: string;
  documentName?: string;
  action: string;
  userAgent?: string;
  storageProvider?: string;
  providerCode?: string;
  remarks?: string;
  details?: string;
  ipAddress?: string;
  createdDate: string;
}

export interface DashboardStats {
  totalDocuments: number;
  totalStorageBytes: number;
  totalApplications: number;
  activeUsers: number;
  uploadsToday: number;
  downloadsToday: number;
  failedOperations: number;
  storageHealth: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
  errors?: string[];
}
