# 💻 End User & Client Portal Integration Manual (`og.thrivera.co`)

## 1. Overview
This manual provides technical integration instructions for developers connecting client web applications, third-party portals (`og.thrivera.co`), ERPs, and mobile applications to Antigravity DMS REST APIs.

---

## 2. Authentication & Authorization Options

DMS supports **2 Authentication Methods**:

### Option A: Master API Token (Recommended for `og.thrivera.co` Server Integrations)
Pass the permanent Master API Key generated from the Applications page in HTTP headers:
```http
Authorization: Bearer dms_app_live_bluestar_NTpCTFVFU1RBUjo0x9f
```

### Option B: User JWT Token (For Direct User Sessions)
Obtain a 24-hour Bearer token via `POST /api/v1/auth/login`:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

---

## 3. Document Upload Workflows

### Mode 1: Single Document Upload (`POST /api/v1/documents/upload`)
Upload a single binary document with entity metadata and remarks:

```bash
curl -X POST "http://localhost:5000/api/v1/documents/upload" \
  -H "Authorization: Bearer dms_app_live_bluestar_NTpCTFVFU1RBUjo0x9f" \
  -F "file=@Invoice_101.pdf" \
  -F "description=Q3 Vendor Payment Invoice" \
  -F "moduleCode=DEALER" \
  -F "entityType=DEALER_USER" \
  -F "entityId=USER_45"
```

### Mode 2: Multi-Row Table ("Add Row") Batch Upload (`POST /api/v1/documents/upload-batch`)
Upload multiple documents with row-level DocumentType and Remarks:

```bash
curl -X POST "http://localhost:5000/api/v1/documents/upload-batch" \
  -H "Authorization: Bearer dms_app_live_bluestar_NTpCTFVFU1RBUjo0x9f" \
  -F "files=@GST_Cert.pdf" \
  -F "documentTypeCodes=GST" \
  -F "remarks=Mandatory GST Certificate" \
  -F "files=@Pan_Card.png" \
  -F "documentTypeCodes=PAN" \
  -F "remarks=PAN Card Copy" \
  -F "moduleCode=DEALER" \
  -F "entityType=DEALER_USER" \
  -F "entityId=USER_45"
```

---

## 4. In-Browser Document Preview & Download

### In-Browser PDF/Image Preview (`<iframe>` Embedding)
Embed interactive document previews directly in third-party client web pages (`og.thrivera.co`):
```html
<iframe
  src="http://localhost:5000/api/v1/documents/{PUBLIC_ID}/preview?token=dms_app_live_bluestar_NTpCTFVFU1RBUjo0x9f"
  width="100%"
  height="650px"
  style="border: none; border-radius: 12px;"
></iframe>
```

### File Stream Download
```http
GET /api/v1/documents/{PUBLIC_ID}/download
Authorization: Bearer dms_app_live_bluestar_NTpCTFVFU1RBUjo0x9f
```

---
*Antigravity Enterprise DMS v2.0 — End User & Client Integration Manual*
