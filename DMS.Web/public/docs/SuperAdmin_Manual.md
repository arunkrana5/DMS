# 🛡️ SuperAdmin Platform Operating Manual

## 1. Platform Architectural Overview
Antigravity DMS is an Enterprise Multi-Tenant Document Management Platform designed for scale, isolation, and dynamic storage provider routing.

### Key Capabilities:
- **Tenant Isolation**: Complete row-level and folder-level tenant data partitioning (TenantId).
- **Multi-Cloud Storage Engine**: Local Disk, Amazon S3, Azure Blob, Google Drive, and On-Prem Agent support.
- **Dynamic Routing Rules**: Application, Module, and DocumentType based storage routing.
- **Global Audit Trail**: 100% immutable activity logging for all tenant operations.

---

## 2. SuperAdmin Standard Operating Procedure (SOP): New Client Onboarding Workflow

When a NEW CLIENT (Enterprise Tenant e.g. Thrivera, BlueStar, ACME Corp) is onboarded, follow these exact 7 steps:

### Step 1: Provision Enterprise Tenant (`/tenants`)
1. Go to Tenants & Users page (`http://localhost:5173/tenants`).
2. Click `+ Add Tenant`.
3. Fill Tenant Code (e.g. `THRIVERA`), Tenant Name (`Thrivera Enterprise Corp`), Admin Email, Username (`admin`), and Password (`Password123!`).
4. Click `Create Tenant`. System provisions TenantId (e.g. Tenant #5).

### Step 2: Configure Storage Profile (`/storage`)
1. Go to Storage Management (`http://localhost:5173/storage`).
2. Click `+ Add Storage Profile`.
3. Select Target Tenant: `🏢 THRIVERA — Thrivera Enterprise Corp (Tenant #5)`.
4. Choose Provider Type (Local Disk, AWS S3, Azure Blob, Google Drive).
5. Check `Set as Default Storage Profile for this Tenant`.
6. Click Save Profile and verify using `Test Connection`.

### Step 3: Register Consuming Application & Master Key (`/applications`)
1. Go to Applications (`http://localhost:5173/applications`).
2. Click `+ Register App`.
3. Fill App Code (`THRIVERA_PORTAL`), App Name (`Thrivera Client Portal`), and Description.
4. System generates permanent Master API Token (`dms_app_live_thrivera_portal_...`).
5. Click `Copy Token` and hand over to client dev team to set in `.env` (`DMS_MASTER_API_KEY`).

### Step 4: Enable Business Domain Modules (`/document-types`)
1. Enable active business domain modules for the client (e.g. `DEALER`, `HEALTHCARE`, `LEGAL`).

### Step 5: Setup Document Types & Validation Rules (`/document-types`)
1. Go to Document Types (`http://localhost:5173/document-types`).
2. Add document categories (e.g. `GST Certificate`, `PAN Card`, `Contract`).
3. Set validation constraints (`IsMandatory`, `MaxAllowedFiles`, `AllowedExtensions`).

### Step 6: Link Application to Storage Profile (`/storage`)
1. Go to Storage Management (`http://localhost:5173/storage`).
2. Under Application Links, click `+ Link App to Storage`.
3. Link Application `THRIVERA_PORTAL` ➔ Target Storage Profile (`Thrivera S3 Bucket`).

### Step 7: Final Verification & Handover Test
1. Perform test upload using client Master API Key.
2. Confirm HTTP 200 OK response.
3. Share API Manual & Integration Guide link (`http://localhost:5173/api-manual`) with client team.

---

## 3. SuperAdmin Core Responsibilities

### A. Enterprise Tenant Provisioning (GET / POST /api/v1/tenants)
- Provision new enterprise tenants (e.g. TENANT_A, BLUESTAR, HEALTHCARE_INC).
- Each tenant is assigned a unique TenantCode, PublicId (GUID), and initial AdminUser.

### B. Global Storage Profiles Management (GET / POST / PUT /api/v1/storage/profiles)
- Configure physical storage backends across tenants.
- Properties: ProviderCode (`LOCAL`, `AWS_S3`, `AZURE_BLOB`), ConfigurationJson, IsDefault, TenantId.

### C. Storage Routing Rules (GET / POST / DELETE /api/v1/storage/routing-rules)
- Define precedence-based storage routing rules.

### D. System Health & Global Audit Logs (GET /api/v1/audit)
- Real-time audit log tracking across all tenants.

---

## 4. SuperAdmin API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/tenants` | List all enterprise tenants |
| `POST` | `/api/v1/tenants` | Provision new enterprise tenant |
| `GET` | `/api/v1/storage/profiles` | List storage profiles across tenants |
| `POST` | `/api/v1/storage/profiles` | Create new storage profile |
| `PUT` | `/api/v1/storage/profiles/{id}` | Edit storage profile settings |
| `GET` | `/api/v1/storage/routing-rules` | Query active storage routing rules |
| `POST` | `/api/v1/storage/routing-rules` | Add application storage routing rule |
| `GET` | `/api/v1/audit` | Fetch global platform audit logs |

---
*Antigravity Enterprise DMS v2.0 — SuperAdmin Manual*
