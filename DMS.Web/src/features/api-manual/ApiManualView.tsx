import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Building2,
  Code,
  Key,
  CheckCircle2,
  Printer,
  Layers,
  Server,
  Cloud,
  AppWindow,
  FileSpreadsheet
} from 'lucide-react';

interface ApiCase {
  id: string;
  title: string;
  category: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  description: string;
  headers: Record<string, string>;
  requestBody?: any;
  formParams?: Array<{ key: string; value: string; desc: string }>;
  responseExample: any;
  jsCode: string;
  csharpCode: string;
  curlCode: string;
}

export const ApiManualView: React.FC = () => {
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<'api' | 'superadmin' | 'tenantadmin' | 'enduser'>('superadmin');
  const [activeTab, setActiveTab] = useState<string>('auth');
  const [codeLanguage, setCodeLanguage] = useState<'curl' | 'javascript' | 'csharp' | 'postman'>('curl');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Interactive Live Code Generator State for End User Guide
  const [liveAppCode, setLiveAppCode] = useState('THRIVERA_PORTAL');
  const [liveEntityType, setLiveEntityType] = useState('DEALER_USER');
  const [liveEntityId, setLiveEntityId] = useState('USER_45');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadTextFile = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    window.print();
  };

  const superAdminContent = `# 🛡️ SuperAdmin Platform Operating Manual

## 1. Platform Architectural Overview
Antigravity DMS is an Enterprise Multi-Tenant Document Management Platform designed for scale, isolation, and dynamic storage provider routing.

## 2. SuperAdmin Standard Operating Procedure (SOP): New Client Onboarding Workflow
Step 1: Provision Enterprise Tenant (/tenants)
Step 2: Configure Storage Profile (/storage)
Step 3: Register Consuming Application & Master Key (/applications)
Step 4: Enable Business Domain Modules (/document-types)
Step 5: Setup Document Types & Validation Rules (/document-types)
Step 6: Link Application to Storage Profile (/storage)
Step 7: Final Verification & Handover Test
`;

  const onboardingSteps = [
    {
      step: '01',
      title: 'Provision Enterprise Tenant Namespace',
      path: '/tenants',
      badge: 'Tenants Module',
      icon: Building2,
      desc: 'Create a new isolated enterprise tenant workspace. DMS automatically partitions database schemas and assigns a unique TenantId.',
      actionText: 'Go to Tenants Page ➔',
      details: [
        'Enter Tenant Code & Full Name.',
        'Set primary contact email and admin credentials.',
        'Initial Admin user is provisioned automatically.'
      ],
      codeSnippet: `POST /api/v1/tenants\n{\n  "tenantCode": "THRIVERA",\n  "tenantName": "Thrivera Enterprise Corp",\n  "contactEmail": "admin@thrivera.co",\n  "adminUsername": "admin",\n  "adminPassword": "Password123!"\n}`
    },
    {
      step: '02',
      title: 'Configure Dedicated Storage Profile',
      path: '/storage',
      badge: 'Storage Module',
      icon: Server,
      desc: 'Set up physical storage backends (Local Disk, AWS S3 Bucket, Azure Blob, Google Drive) assigned to the newly provisioned tenant.',
      actionText: 'Go to Storage Profiles ➔',
      details: [
        'Select Target Tenant.',
        'Choose Provider Type (AWS_S3, LOCAL, AZURE_BLOB).',
        'Check "Set as Default Storage Profile for this Tenant".',
        'Click "Test Connection" to verify connectivity.'
      ],
      codeSnippet: `POST /api/v1/storage/profiles\n{\n  "tenantId": 5,\n  "name": "Thrivera AWS S3 Primary Bucket",\n  "providerCode": "AWS_S3",\n  "isDefault": true,\n  "configurationJson": "{\\"BucketName\\": \\"thrivera-s3\\", \\"Region\\": \\"ap-south-1\\"}"\n}`
    },
    {
      step: '03',
      title: 'Register Consuming Application & Master Key',
      path: '/applications',
      badge: 'Applications Module',
      icon: AppWindow,
      desc: 'Register the client portal or third-party system to generate a permanent Master API Key for server-to-server integration.',
      actionText: 'Go to Applications ➔',
      details: [
        'Enter Application Code.',
        'System generates Master API Key: dms_app_live_thrivera_portal_...x9f.',
        'Copy key and hand over to client team for their .env file.'
      ],
      codeSnippet: `# Client .env file\nDMS_BASE_URL=http://localhost:5000\nDMS_MASTER_API_KEY=dms_app_live_thrivera_portal_NTpCTFVFU1RBUjo0x9f`
    },
    {
      step: '04',
      title: 'Enable Tenant Business Domain Modules',
      path: '/document-types',
      badge: 'Modules Config',
      icon: Layers,
      desc: 'Configure active business domain modules for the client (such as DEALER, HEALTHCARE, LEGAL, FINANCE) to scope document uploads.',
      actionText: 'Configure Modules ➔',
      details: [
        'Enable domain-specific modules.',
        'Modules allow client apps to tag uploads with moduleCode=DEALER.'
      ],
      codeSnippet: `POST /api/v1/tenant-modules\n{\n  "moduleCode": "DEALER",\n  "moduleName": "Dealer & Customer Network",\n  "isActive": true\n}`
    },
    {
      step: '05',
      title: 'Define Document Types & Validation Rules',
      path: '/document-types',
      badge: 'Rules Engine',
      icon: FileSpreadsheet,
      desc: 'Create document categories (GST, PAN, Invoice, Contract) and configure strict validation policies (Mandatory upload, Max allowed files, Allowed extensions).',
      actionText: 'Go to Document Types ➔',
      details: [
        'Add Document Category.',
        'Set IsMandatory = true, MaxAllowedFiles = 5.',
        'Set Allowed Extensions (.pdf, .png).'
      ],
      codeSnippet: `POST /api/v1/document-types\n{\n  "code": "GST",\n  "name": "GST Registration Certificate",\n  "isMandatory": true,\n  "allowedExtensions": ".pdf,.png"\n}`
    },
    {
      step: '06',
      title: 'Link Application to Storage Profile (Routing Rule)',
      path: '/storage',
      badge: 'Routing Engine',
      icon: Cloud,
      desc: 'Create a storage routing rule to explicitly route uploads from THRIVERA_PORTAL directly to the client S3 bucket or designated storage provider.',
      actionText: 'Link App to Storage ➔',
      details: [
        'Under Storage Management, click "+ Link App to Storage".',
        'Select Application (THRIVERA_PORTAL) ➔ Target Storage Profile (Thrivera S3).',
        'Save Link Rule.'
      ],
      codeSnippet: `POST /api/v1/storage/routing-rules\n{\n  "applicationId": 5,\n  "storageProfileId": 2,\n  "priority": 10\n}`
    },
    {
      step: '07',
      title: 'Execute Verification Test & Handover',
      path: '/documents',
      badge: 'Verification',
      icon: CheckCircle2,
      desc: 'Execute a test upload using the client Master API Key to verify HTTP 200 OK success, then share the API Manual & Integration Guide with the client team.',
      actionText: 'Test Document Explorer ➔',
      details: [
        'Run test upload curl command with Master API Key.',
        'Confirm HTTP 200 OK and file physical storage creation.',
        'Hand over API Manual link (http://localhost:5173/api-manual).'
      ],
      codeSnippet: `curl -X POST "http://localhost:5000/api/v1/documents/upload" \\\n  -H "Authorization: Bearer dms_app_live_thrivera_portal_NTpCTFVFU1RBUjo0x9f" \\\n  -F "file=@sample.pdf" \\\n  -F "moduleCode=DEALER" \\\n  -F "entityId=USER_01"`
    }
  ];

  const apiCases: ApiCase[] = [
    {
      id: 'auth',
      title: 'Case 1: JWT Authentication & Tenant Login',
      category: 'Authentication',
      method: 'POST',
      endpoint: 'http://localhost:5000/api/v1/auth/login',
      description: 'Authenticate your client application or tenant admin to obtain a 24-hour Bearer JWT security token.',
      headers: { 'Content-Type': 'application/json' },
      requestBody: {
        tenantCode: 'COMPANY_ACME',
        username: 'admin',
        password: 'Password123!'
      },
      responseExample: {
        success: true,
        message: 'Login successful.',
        data: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...',
          tenantCode: 'COMPANY_ACME',
          tenantName: 'ACME Corporation',
          username: 'admin',
          email: 'admin@acme.com',
          roles: ['ADMIN']
        }
      },
      curlCode: `curl -X POST "http://localhost:5000/api/v1/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"tenantCode":"COMPANY_ACME","username":"admin","password":"Password123!"}'`,
      jsCode: `const response = await fetch('http://localhost:5000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenantCode: 'COMPANY_ACME',
    username: 'admin',
    password: 'Password123!'
  })
});
const result = await response.json();
const token = result.data.token;`,
      csharpCode: `using var client = new HttpClient();
var payload = new { tenantCode = "COMPANY_ACME", username = "admin", password = "Password123!" };
var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

var response = await client.PostAsync("http://localhost:5000/api/v1/auth/login", content);
var json = await response.Content.ReadAsStringAsync();`
    },
    {
      id: 'master-token-upload',
      title: 'Case 2: Master Token Upload (og.thrivera.co Portal)',
      category: 'Master Token',
      method: 'POST',
      endpoint: 'http://localhost:5000/api/v1/documents/upload-batch',
      description: 'Upload batch documents directly from third-party portals using permanent Master API Token (dms_app_live_...) with User Entity Metadata.',
      headers: { 'Authorization': 'Bearer dms_app_live_bluestar_NTpCTFVFU1RBUjo0x9f' },
      formParams: [
        { key: 'files', value: '<BINARY_FILE_STREAM>', desc: 'Physical document stream' },
        { key: 'documentTypeCodes', value: 'GST', desc: 'Code string of document type' },
        { key: 'remarks', value: 'GST Registration Certificate Upload', desc: 'Row-level user remarks' },
        { key: 'moduleCode', value: 'DEALER', desc: 'Business domain module' },
        { key: 'entityType', value: 'DEALER_USER', desc: 'Client portal user entity type' },
        { key: 'entityId', value: 'USER_45', desc: 'Portal end-user ID or name' }
      ],
      responseExample: {
        success: true,
        message: 'Batch uploaded successfully.',
        data: {
          totalUploaded: 1,
          documents: [
            {
              id: 35,
              fileName: 'GST_Cert.pdf',
              uploadedByName: 'USER_45 (DEALER_USER)',
              providerCode: 'LOCAL'
            }
          ]
        }
      },
      curlCode: `curl -X POST "http://localhost:5000/api/v1/documents/upload-batch" \\
  -H "Authorization: Bearer dms_app_live_bluestar_NTpCTFVFU1RBUjo0x9f" \\
  -F "files=@C:\\Docs\\GST_Cert.pdf" \\
  -F "documentTypeCodes=GST" \\
  -F "remarks=GST Registration Certificate Upload" \\
  -F "moduleCode=DEALER" \\
  -F "entityType=DEALER_USER" \\
  -F "entityId=USER_45"`,
      jsCode: `const formData = new FormData();
formData.append('files', fileInput.files[0]);
formData.append('documentTypeCodes', 'GST');
formData.append('remarks', 'GST Registration Certificate Upload');
formData.append('moduleCode', 'DEALER');
formData.append('entityType', 'DEALER_USER');
formData.append('entityId', 'USER_45');

const response = await fetch('http://localhost:5000/api/v1/documents/upload-batch', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer dms_app_live_bluestar_NTpCTFVFU1RBUjo0x9f' },
  body: formData
});`,
      csharpCode: `using var client = new HttpClient();
client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "dms_app_live_bluestar_NTpCTFVFU1RBUjo0x9f");

using var content = new MultipartFormDataContent();
using var stream = File.OpenRead(@"C:\Docs\GST_Cert.pdf");

content.Add(new StreamContent(stream), "files", "GST_Cert.pdf");
content.Add(new StringContent("GST"), "documentTypeCodes");
content.Add(new StringContent("GST Registration Certificate Upload"), "remarks");
content.Add(new StringContent("DEALER"), "moduleCode");
content.Add(new StringContent("USER_45"), "entityId");

var response = await client.PostAsync("http://localhost:5000/api/v1/documents/upload-batch", content);`
    },
    {
      id: 'preview',
      title: 'Case 3: In-Browser Document Preview (<iframe>)',
      category: 'Documents',
      method: 'GET',
      endpoint: 'http://localhost:5000/api/v1/documents/{PUBLIC_ID}/preview?token={MASTER_OR_JWT_TOKEN}',
      description: 'Stream inline document content directly into an HTML iframe or image tag securely using token query parameter.',
      headers: {},
      responseExample: 'Binary Stream (application/pdf, image/jpeg, etc.)',
      curlCode: `curl "http://localhost:5000/api/v1/documents/6737ad16-a083-4819-80f1-96f86ddcabee/preview?token=dms_app_live_bluestar_NTpCTFVFU1RBUjo0x9f" --output preview.pdf`,
      jsCode: `<iframe 
  src="http://localhost:5000/api/v1/documents/\${publicId}/preview?token=dms_app_live_bluestar_NTpCTFVFU1RBUjo0x9f"
  width="100%" 
  height="650px" 
  style="border: none;"
></iframe>`,
      csharpCode: `string previewUrl = $"http://localhost:5000/api/v1/documents/{publicId}/preview?token={masterToken}";`
    }
  ];

  const selectedCase = apiCases.find((c) => c.id === activeTab) || apiCases[0];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto text-xs">
      {/* Top Professional Header Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              API Manual & Technical Docs
            </h1>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Export PDF</span>
          </button>

          <button
            onClick={() => downloadTextFile('SuperAdmin_Manual.md', superAdminContent)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Manual (.md)</span>
          </button>
        </div>
      </div>

      {/* Role Navigation Bar Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setMainTab('superadmin')}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
            mainTab === 'superadmin'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>🛡️ SuperAdmin SOP Guide</span>
        </button>

        <button
          onClick={() => setMainTab('tenantadmin')}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
            mainTab === 'tenantadmin'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>👔 Tenant Admin Manual</span>
        </button>

        <button
          onClick={() => setMainTab('enduser')}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
            mainTab === 'enduser'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>💻 Portal Integration Guide</span>
        </button>

        <button
          onClick={() => setMainTab('api')}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-lg font-extrabold text-xs transition-all cursor-pointer ${
            mainTab === 'api'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>💻 REST API Manual & Cases</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 🛡️ TAB 1: SUPERADMIN SOP GUIDE (VISUAL 7-STEP WORKFLOW) */}
      {/* ========================================================= */}
      {mainTab === 'superadmin' && (
        <div className="space-y-4">
          {/* 7 Visual Onboarding Steppers */}
          <div className="space-y-3">
            {onboardingSteps.map((s) => {
              const IconComp = s.icon;
              return (
                <div
                  key={s.step}
                  className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-start justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Number Badge */}
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 font-extrabold text-sm flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800 shadow-xs">
                      {s.step}
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <IconComp className="w-4 h-4 text-indigo-600" />
                          <span>{s.title}</span>
                        </h3>
                        <span className="px-2 py-0.3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-mono font-bold rounded-md border border-slate-200 dark:border-slate-700">
                          {s.badge}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{s.desc}</p>

                      {/* Checklist bullets */}
                      <ul className="space-y-1 pt-1">
                        {s.details.map((d, dIdx) => (
                          <li key={dIdx} className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Right Action & Code Snippet Box */}
                  <div className="lg:w-80 shrink-0 space-y-2">
                    <button
                      onClick={() => navigate(s.path)}
                      className="w-full px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-lg border border-indigo-200 dark:border-indigo-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>{s.actionText}</span>
                    </button>

                    <div className="relative group">
                      <pre className="p-2 bg-slate-950 text-slate-200 rounded-lg font-mono text-[10px] overflow-x-auto border border-slate-800 max-h-28">
                        {s.codeSnippet}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(s.codeSnippet, s.step)}
                        className="absolute right-2 top-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] font-bold"
                        title="Copy Code"
                      >
                        {copiedId === s.step ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 👔 TAB 2: TENANT ADMIN OPERATING MANUAL */}
      {/* ========================================================= */}
      {mainTab === 'tenantadmin' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Feature 1: Business Modules */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>1. Business Domain Modules (`/document-types`)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configure tenant modules (`DEALER`, `HEALTHCARE`, `LEGAL`, `FINANCE`). Enabling modules allows client applications to pass `moduleCode=DEALER` in upload APIs.
              </p>
              <button onClick={() => navigate('/document-types')} className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1">
                Configure Modules ➔
              </button>
            </div>

            {/* Feature 2: Validation Rules */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                <span>2. Document Validation Rules (`/document-types`)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Define mandatory upload rules (`IsMandatory`), max file limits (`MaxAllowedFiles`), allowed extensions (`.pdf,.png`), and size caps per document category.
              </p>
              <button onClick={() => navigate('/document-types')} className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1">
                Configure Rules ➔
              </button>
            </div>

            {/* Feature 3: Applications & Master Keys */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                <AppWindow className="w-4 h-4 text-purple-600" />
                <span>3. Master API Keys (`/applications`)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Register consuming applications and generate permanent Master API Integration Keys (`dms_app_live_...`) with instant 1-click secret rotation.
              </p>
              <button onClick={() => navigate('/applications')} className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1">
                Manage App Keys ➔
              </button>
            </div>

            {/* Feature 4: User & Role Permissions */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>4. User RBAC & Audit Trails (`/tenants`)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Manage user accounts, assign roles (`ADMIN`, `USER`, `AUDITOR`), and inspect tenant activity audit logs in real-time.
              </p>
              <button onClick={() => navigate('/tenants')} className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1">
                Manage Users ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 💻 TAB 3: END USER & CLIENT PORTAL INTEGRATION GUIDE */}
      {/* ========================================================= */}
      {mainTab === 'enduser' && (
        <div className="space-y-4">
          {/* Interactive Live Code Generator Card */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Code className="w-4 h-4 text-emerald-600" />
                <span>Live Interactive Integration Code Generator</span>
              </h3>
              <span className="text-[10px] text-emerald-600 font-bold">Auto-Generates cURL & JS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Application Code</label>
                <input
                  type="text"
                  value={liveAppCode}
                  onChange={(e) => setLiveAppCode(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">User Entity Type</label>
                <input
                  type="text"
                  value={liveEntityType}
                  onChange={(e) => setLiveEntityType(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Portal User ID / Name</label>
                <input
                  type="text"
                  value={liveEntityId}
                  onChange={(e) => setLiveEntityId(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Generated cURL Command (`POST /api/v1/documents/upload-batch`):</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `curl -X POST "http://localhost:5000/api/v1/documents/upload-batch" \\\n  -H "Authorization: Bearer dms_app_live_${liveAppCode.toLowerCase()}_NTpCT...x9f" \\\n  -F "files=@Document.pdf" \\\n  -F "documentTypeCodes=GST" \\\n  -F "remarks=Client portal upload" \\\n  -F "entityType=${liveEntityType}" \\\n  -F "entityId=${liveEntityId}"`,
                      'gen-curl'
                    )
                  }
                  className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === 'gen-curl' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>Copy Code</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto border border-slate-800">
{`curl -X POST "http://localhost:5000/api/v1/documents/upload-batch" \\
  -H "Authorization: Bearer dms_app_live_${liveAppCode.toLowerCase()}_NTpCT...x9f" \\
  -F "files=@Document.pdf" \\
  -F "documentTypeCodes=GST" \\
  -F "remarks=Client portal upload" \\
  -F "entityType=${liveEntityType}" \\
  -F "entityId=${liveEntityId}"`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 💻 TAB 4: REST API CASES & POSTMAN SUITE */}
      {/* ========================================================= */}
      {mainTab === 'api' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3.5">
          {/* Cases Sidebar */}
          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-1 col-span-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">API Integration Cases</span>
            </div>
            {apiCases.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveTab(c.id)}
                className={`w-full text-left p-2 rounded-lg transition-all flex items-center justify-between text-xs font-semibold cursor-pointer ${
                  activeTab === c.id
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate">{c.title}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono shrink-0 ml-1.5 ${
                  c.method === 'POST' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}>
                  {c.method}
                </span>
              </button>
            ))}
          </div>

          {/* Case Details View */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs col-span-3 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-extrabold font-mono ${
                    selectedCase.method === 'POST' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                  }`}>
                    {selectedCase.method}
                  </span>
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">{selectedCase.title}</h2>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{selectedCase.description}</p>
              </div>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold">
                {selectedCase.category}
              </span>
            </div>

            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span className="truncate">{selectedCase.endpoint}</span>
              <button
                onClick={() => copyToClipboard(selectedCase.endpoint, 'endpoint')}
                className="p-1 text-slate-400 hover:text-blue-500 shrink-0 cursor-pointer"
                title="Copy Endpoint"
              >
                {copiedId === 'endpoint' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {selectedCase.formParams && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Multipart Form Parameters</h3>
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                      <tr>
                        <th className="px-3 py-1.5">Parameter Key</th>
                        <th className="px-3 py-1.5">Example Value</th>
                        <th className="px-3 py-1.5">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
                      {selectedCase.formParams.map((p) => (
                        <tr key={p.key}>
                          <td className="px-3 py-1.5 font-mono font-bold text-blue-600 dark:text-blue-400">{p.key}</td>
                          <td className="px-3 py-1.5 font-mono text-slate-700 dark:text-slate-300">{p.value}</td>
                          <td className="px-3 py-1.5 text-slate-400">{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setCodeLanguage('curl')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      codeLanguage === 'curl' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-400'
                    }`}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setCodeLanguage('javascript')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      codeLanguage === 'javascript' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-400'
                    }`}
                  >
                    JavaScript / TS
                  </button>
                  <button
                    onClick={() => setCodeLanguage('csharp')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      codeLanguage === 'csharp' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-400'
                    }`}
                  >
                    C# (.NET)
                  </button>
                </div>

                <button
                  onClick={() =>
                    copyToClipboard(
                      codeLanguage === 'curl'
                        ? selectedCase.curlCode
                        : codeLanguage === 'javascript'
                        ? selectedCase.jsCode
                        : selectedCase.csharpCode,
                      'code'
                    )
                  }
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedId === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Code</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto border border-slate-800 max-h-60">
                {codeLanguage === 'curl'
                  ? selectedCase.curlCode
                  : codeLanguage === 'javascript'
                  ? selectedCase.jsCode
                  : selectedCase.csharpCode}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiManualView;
