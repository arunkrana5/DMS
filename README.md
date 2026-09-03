# Enterprise Multi-Tenant Document Management System (DMS)

A reusable common platform for managing documents across multiple business applications (ERP, HRMS, CRM, Sales, Finance) and multiple tenants, supporting hybrid storage providers (AWS S3, Azure Blob Storage, Google Drive, OneDrive/SharePoint, Local Disk, NAS, and Local Storage Agent).

---

## System Architecture

```text
                               ┌───────────────────────────────────┐
                               │             DMS.Web               │
                               │  React 19 + Vite + TS Enterprise  │
                               └─────────────────┬─────────────────┘
                                                 │
                                           HTTPS / REST
                                                 │
                                                 ▼
                               ┌───────────────────────────────────┐
                               │              DMS.Api              │
                               │        ASP.NET Core 10 API        │
                               ├───────────────────────────────────┤
                               │ • Authentication (JWT / API Key)  │
                               │ • Multi-Tenant Context Resolver   │
                               │ • Application Integration & Auth  │
                               │ • Document & Version Management   │
                               │ • Folder Hierarchy & Permissions  │
                               │ • Custom Fields, Tags, Metadata   │
                               │ • Storage Resolver & Router       │
                               │ • Webhooks & Audit Logger         │
                               │ • Migration & Retention Jobs      │
                               └─────────────────┬─────────────────┘
                                                 │
                                                 ▼
                                 ┌───────────────────────────────┐
                                 │   SQL Server (EF Core 10)     │
                                 │  Metadata & Storage Configs   │
                                 └───────────────┬───────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │   IStorageProviderFactory   │
                                  └──────────────┬──────────────┘
                                                 │
            ┌───────────────────┬────────────────┼───────────────────┬───────────────────┐
            ▼                   ▼                ▼                   ▼                   ▼
       ┌──────────┐        ┌──────────┐     ┌──────────┐        ┌──────────┐      ┌─────────────┐
       │  AWS S3  │        │  Azure   │     │  Google  │        │ OneDrive │      │ Local Agent │
       │ Provider │        │   Blob   │     │  Drive   │        │SharePoint│      │  (NAS/Disk) │
       └──────────┘        └──────────┘     └──────────┘        └──────────┘      └──────┬──────┘
                                                                                         │ HTTPS
                                                                                         ▼
                                                                                  ┌─────────────┐
                                                                                  │ StorageAgent│
                                                                                  │ Local / NAS │
                                                                                  └─────────────┘
```

---

## Projects Overview

The solution consists of **exactly two main application projects**:

1. `DMS.Api` — ASP.NET Core 10 Web API (`D:\DMS\DMS.Api`)
2. `DMS.Web` — React 19 + Vite + TypeScript (`D:\DMS\DMS.Web`)

---

## Prerequisites

- .NET 10.0 SDK
- Node.js v20+ / v24+
- SQL Server / LocalDB (`(localdb)\MSSQLLocalDB`)

---

## Quick Start Guide

### 1. Backend Setup (`DMS.Api`)

```bash
cd D:\DMS\DMS.Api
dotnet run
```

- API URL: `http://localhost:5000`
- Swagger Documentation: `http://localhost:5000/swagger`
- Health Endpoint: `http://localhost:5000/health`

*Note: Database auto-migration and seeding runs on startup. Three default tenants are initialized (`TENANT_A`, `TENANT_B`, `TENANT_C`).*

### 2. Frontend Setup (`DMS.Web`)

```bash
cd D:\DMS\DMS.Web
npm install
npm run dev
```

- Web App URL: `http://localhost:3000`

---

## Default Test Credentials

| Tenant Code | Tenant Name | Username | Password | Storage Profile |
|---|---|---|---|---|
| `TENANT_A` | ABC Enterprise Corp | `admin` | `AdminPassword123!` | Local Disk / Azure Blob |
| `TENANT_B` | Global Dynamics Ltd | `admin` | `AdminPassword123!` | AWS S3 / Google Drive |
| `TENANT_C` | OnPrem Financials | `admin` | `AdminPassword123!` | Local Storage Agent (NAS) |

---

## Core Features Implemented

1. **Multi-Tenancy & App Isolation**: Complete data segregation by `TenantId` and `ApplicationId`.
2. **Storage Routing**: Automatic storage provider selection based on Tenant, Application, ModuleCode, EntityType, and DocumentType.
3. **Storage Providers**:
   - `LocalStorageProvider` (Local Disk)
   - `AwsS3StorageProvider` (AWS S3 / S3 Compatible)
   - `AzureBlobStorageProvider` (Azure Blob Storage)
   - `GoogleDriveStorageProvider` (Google Drive)
   - `OneDriveStorageProvider` & `SharePointStorageProvider` (MS Graph API)
   - `LocalStorageAgentProvider` (Secure HTTPS local disk/NAS agent bridge)
4. **Document Versioning**: Upload new versions, download historical versions, restore versions.
5. **Idempotency**: `Idempotency-Key` header support prevents storage duplication.
6. **High Performance**: `System.Threading.Channels` for non-blocking audit logging & webhook delivery.
7. **Storage Migration**: Asynchronous background migration between storage profiles.
8. **Modern Enterprise UI**: React 19 + Lucide icons + Tailwind CSS + dark mode.
