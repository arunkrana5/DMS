# 👔 Tenant Administrator Operating Manual

## 1. Overview
As a Tenant Administrator, you manage business rules, document validation policies, client application access keys, and user permissions within your enterprise tenant namespace.

---

## 2. Core Tenant Admin Features

### A. Business Modules Configuration (`GET / POST /api/v1/tenant-modules`)
- Define tenant-specific business domain modules (e.g. `DEALER`, `HEALTHCARE`, `LEGAL`, `FINANCE`).
- Enable or disable modules on-the-fly without restarting services.

### B. Document Types & Validation Rules (`GET / POST /api/v1/document-types`)
- Create document categories (e.g. `GST_CERTIFICATE`, `PATIENT_RECORD`, `INVOICE`, `ID_PROOF`).
- Configure validation rules per document type:
  - `IsMandatory`: Requires mandatory document upload in batch workflows.
  - `MaxAllowedFiles`: Limits maximum row uploads for a category.
  - `AllowedExtensions`: Restrict file types (e.g. `.pdf,.png,.jpg`).
  - `MaxFileSizeBytes`: Enforce maximum file size limits (e.g. 10MB).

### C. Application Registration & Master Token Management (`GET / POST /api/v1/applications`)
- Register consuming applications (e.g. `THRIVERA_PORTAL`, `ERP_SUITE`).
- Generate **Master API Integration Keys** (`dms_app_live_...`) for server-to-server B2B integrations (`og.thrivera.co`).
- One-click secret rotation and token revocation.

### D. User Management & Role Permissions (`GET / POST /api/v1/users`)
- Manage tenant users, assign roles (`ADMIN`, `USER`, `AUDITOR`), and manage status.

---

## 3. Tenant Admin API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/tenant-modules` | Fetch active tenant business modules |
| `POST` | `/api/v1/tenant-modules` | Add new business module |
| `GET` | `/api/v1/document-types` | Fetch document types & validation rules |
| `POST` | `/api/v1/document-types` | Define new document type |
| `GET` | `/api/v1/applications` | List registered consuming applications |
| `POST` | `/api/v1/applications` | Register new application & generate Master Key |

---
*Antigravity Enterprise DMS v2.0 — Tenant Admin Manual*
