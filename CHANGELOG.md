# Enterprise Multi-Tenant DMS — Official Release Notes & Changelog

All notable changes to the **Antigravity Enterprise DMS** platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v2.5.0-Enterprise] - 2026-09-10 (Current Production Release)

### 🎨 Dynamic Tenant Branding & Zero-Flash UI (FOUT/FOT)
- **Instant Zero-Flash Theme & Text Rendering**: Implemented synchronous `localStorage` state lazy initializer in `ThemeContext.tsx` (`dms_tenant_app_name`, `dms_tenant_app_highlight`, `dms_tenant_app_subtitle`, `dms_tenant_company_name`, `dms_tenant_theme_color`).
- **Inline Head Pre-Render Script**: Injected synchronous CSS variable pre-render script into `<head>` in `index.html` to eliminate initial default blue color flash before React hydration.
- **Custom Hex Palette Generator**: Added RGB threshold detection for Magenta/Pink (`#93387a`), Fuchsia, Cyan, Indigo, and custom tenant colors with auto-calculated hover & 2-tone gradient pairs (`--tenant-gradient-start`, `--tenant-gradient-end`).
- **100% Dynamic CSS Custom Property Engine**: Standardized all UI components to consume dynamic CSS custom variables (`--tenant-primary`, `--tenant-ring-color`, `--tenant-primary-light-bg`, `--tenant-primary-dark-bg`).
- **Dynamic Browser Document Titles & OS Desktop Notifications**: Synchronized app configuration settings with `document.title` and browser `Notification` API.

### 🔍 Enterprise Multi-Field Search Engine
- **Multi-Attribute Document Search**: Upgraded `SearchDocumentsAsync` in `DocumentService.cs` to match across `FileName`, `OriginalFileName`, `Description`, `ModuleCode`, `EntityType`, `EntityId`, `Extension`, `DocumentType.Name`, `DocumentType.Code`, and `PublicId` GUIDs.
- **Global & Local Navbar Search Synchronization**: Integrated `useOutletContext` hook across `DocumentExplorer`, `AuditLogView`, `TenantsView`, `ApplicationsView`, `RolesView`, `NotificationsView`, `DocumentTypesView`, and `WebhooksView` so typing into the navbar search input immediately filters the active screen.
- **Notifications Keyword Search**: Added `search` query parameter filtering to `NotificationsController.cs` for `Title`, `Message`, and `NotificationType`.

### 🔒 Cryptographic Password Hashing & Security Hardening
- **Salted PBKDF2 HMAC-SHA256 Hashing**: Implemented `PasswordSecurityService.cs` utilizing ASP.NET Core `PasswordHasher<object>` (PBKDF2 with HMAC-SHA256, 100,000 iterations, and 128-bit cryptographically secure random salt). Eliminated plain text password storage in SQL Server.
- **Transparent Rehash Upgrade**: `AuthController.cs` automatically verifies passwords and upgrades legacy unhashed password hashes to salted PBKDF2 on successful login.
- **JWT Replay Attack Defense**: Enhanced `JwtTokenService.cs` with `Jti` (unique Guid per token), `Nbf` (not-before), and `Iat` (issued-at) claims.
- **Strict Zero Clock Skew Token Validation**: Enforced 256-bit symmetric SHA-256 key padding and zero clock skew (`TimeSpan.Zero`) in `Program.cs` token validation parameters.

### ⚙️ Config-Driven Direct Client Tenant Management
- **Direct Target Tenant Dropdown**: Added an explicit **Assign To Tenant (Client)** dropdown inside the Create / Edit Config Setting modal in `/config-settings`.
- **Professional Labeling**: Cleaned up internal database terminology (`TenantId = NULL`) into user-friendly enterprise labels (`Global System Default (All Clients)`).
- **Backend DTO Integration**: Upgraded `SaveConfigSettingRequest`, `SaveSetting`, and `UpdateSetting` in `ConfigSettingsController.cs` to accept explicit `TenantId` overrides.

### 🌐 SPA URL Refresh & Master SQL Artifacts
- **404 Resolution on Route Refresh**: Integrated `app.MapFallbackToFile("index.html")` in `Program.cs`, `appType: 'spa'` in `vite.config.ts`, and IIS `web.config` rewrite rules to ensure refreshing any URL path resolves cleanly with status `200 OK`.
- **Standalone Master SQL Script (`schema_and_seed.sql`)**: Generated a single, standalone SQL Server / Azure SQL script file containing full table definitions (`Tenants`, `Roles`, `Users`, `Permissions`, `StorageProfiles`, `ConfigSettings`, `Notifications`, `AuditLogs`).

---

## [v2.0.0] - 2026-08-15 (Multi-Tenant Core Release)

### Added
- **Multi-Tenant Isolation**: Multi-tenant database context middleware (`TenantContextMiddleware.cs`) resolving tenant ID from `X-Tenant-Code` header.
- **Storage Provider Factory & Routing**: Dynamic storage provider abstraction supporting Local FileSystem, AWS S3, and Azure Blob Storage based on tenant routing rules.
- **Document Version Control**: Multi-version document history tracking, active version flags, and download/preview API endpoints.
- **Multi-Row Table Upload**: Single-transaction batch upload interface for mandatory document type verification (GST, PAN, Invoices).

---

## [v1.0.0] - 2026-07-01 (Initial Foundation)

### Added
- **Authentication & RBAC**: Initial JWT login, tenant user management, roles, and granular permission checking.
- **Core Document REST API**: Basic document upload, download, metadata update, and soft-delete endpoints.
- **Notification Bell & Webhooks**: Real-time notification center and event webhook dispatching engine.
