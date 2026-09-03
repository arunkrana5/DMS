import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import type { StorageProfile } from '../../types';
import { Pagination } from '../../components/common/Pagination';
import {
  Plus,
  RefreshCw,
  Server,
  Cloud,
  Building2,
  Pencil,
  X,
  Link,
  Trash2,
  AppWindow,
  ArrowRight
} from 'lucide-react';

export const StorageManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<StorageProfile[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [routingRules, setRoutingRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<{ [id: number]: any }>({});
  const [testingId, setTestingId] = useState<number | null>(null);

  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Profile Modal & Edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<StorageProfile | null>(null);
  const [name, setName] = useState('');
  const [targetTenantId, setTargetTenantId] = useState<number>(1);
  const [providerCode, setProviderCode] = useState('LOCAL');
  const [isDefault, setIsDefault] = useState(false);
  const [configJson, setConfigJson] = useState('{\n  "BasePath": "Storage"\n}');

  // Routing Rule Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleAppId, setRuleAppId] = useState<number | ''>('');
  const [ruleProfileId, setRuleProfileId] = useState<number | ''>('');
  const [ruleModuleCode, setRuleModuleCode] = useState('');

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/storage/profiles?pageIndex=${pageIndex}&pageSize=${pageSize}`);
      if (res.data?.success) {
        setProfiles(res.data.data.items || []);
        setTotalCount(res.data.data.totalCount || 0);
        setTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await api.get('/tenants?pageSize=100');
      if (res.data?.success) {
        const items = res.data.data.items || [];
        setTenants(items);
        if (items.length > 0 && !editingProfile) setTargetTenantId(items[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApps = async () => {
    try {
      const res = await api.get('/applications?pageSize=100');
      if (res.data?.success) {
        setApps(res.data.data.items || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRoutingRules = async () => {
    try {
      const res = await api.get('/storage/routing-rules');
      if (res.data?.success) {
        setRoutingRules(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchModules = async () => {
    try {
      const res = await api.get('/tenant-modules?pageSize=100');
      if (res.data?.success) {
        const data = res.data.data;
        const list = Array.isArray(data) ? data : (data?.items || []);
        setModules(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchTenants();
    fetchApps();
    fetchModules();
    fetchRoutingRules();
  }, [pageIndex, pageSize]);

  const handleOpenAddModal = () => {
    setEditingProfile(null);
    setName('');
    setProviderCode('LOCAL');
    setIsDefault(false);
    setConfigJson('{\n  "BasePath": "Storage"\n}');
    if (tenants.length > 0) setTargetTenantId(tenants[0].id);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: StorageProfile) => {
    setEditingProfile(p);
    setName(p.name);
    setTargetTenantId(p.tenantId);
    setProviderCode(p.providerCode);
    setIsDefault(p.isDefault);
    setConfigJson(p.configurationJson || '{\n  "BasePath": "Storage"\n}');
    setIsModalOpen(true);
  };

  const handleTestConnection = async (id: number) => {
    setTestingId(id);
    try {
      const res = await api.post(`/storage/profiles/${id}/test`);
      if (res.data?.success) {
        setTestResults((prev) => ({ ...prev, [id]: res.data.data }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTestingId(null);
    }
  };

  const handleProviderSelect = (code: string) => {
    setProviderCode(code);
    switch (code) {
      case 'AWS_S3':
        setConfigJson('{\n  "BucketName": "enterprise-s3-bucket",\n  "Region": "us-east-1"\n}');
        break;
      case 'AZURE_BLOB':
        setConfigJson('{\n  "ConnectionString": "DefaultEndpointsProtocol=https;...",\n  "ContainerName": "dms-container"\n}');
        break;
      case 'GOOGLE_DRIVE':
        setConfigJson('{\n  "FolderId": "root"\n}');
        break;
      case 'LOCAL_AGENT':
        setConfigJson('{\n  "AgentUrl": "https://localhost:7099/agent",\n  "AuthToken": "secret-token",\n  "RootPath": "D:\\\\NAS_Storage"\n}');
        break;
      case 'LOCAL':
      default:
        setConfigJson('{\n  "BasePath": "Storage"\n}');
        break;
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        tenantId: targetTenantId,
        name,
        providerCode,
        isDefault,
        configurationJson: configJson,
      };

      let res;
      if (editingProfile) {
        res = await api.put(`/storage/profiles/${editingProfile.id}`, payload);
      } else {
        res = await api.post('/storage/profiles', payload);
      }

      if (res.data?.success) {
        setIsModalOpen(false);
        setEditingProfile(null);
        setName('');
        fetchProfiles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRoutingRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleProfileId) return;

    try {
      const res = await api.post('/storage/routing-rules', {
        applicationId: ruleAppId ? Number(ruleAppId) : null,
        storageProfileId: Number(ruleProfileId),
        moduleCode: ruleModuleCode.trim() || null,
        priority: 10
      });

      if (res.data?.success) {
        setIsRuleModalOpen(false);
        setRuleAppId('');
        setRuleProfileId('');
        setRuleModuleCode('');
        fetchRoutingRules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRule = async (id: number) => {
    try {
      await api.delete(`/storage/routing-rules/${id}`);
      fetchRoutingRules();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto text-xs">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600" />
            <span>Storage Management</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRuleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-lg shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <Link className="w-3.5 h-3.5" />
            <span>+ Link App to Storage</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Storage Profile</span>
          </button>
        </div>
      </div>

      {/* Profiles List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-xs flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <span>Active Storage Profiles</span>
          <span className="text-[10px] text-slate-400 font-mono">Tenant Isolation Active</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading storage profiles...</div>
        ) : profiles.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No storage profiles found. Click "Add Storage Profile" to configure storage.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {profiles.map((p) => {
              const test = testResults[p.id];
              return (
                <div key={p.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-200 dark:border-blue-900">
                      {p.providerCode === 'AWS_S3' || p.providerCode === 'AZURE_BLOB' ? <Cloud className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white text-xs truncate">{p.name}</span>

                        <span className="px-2 py-0.3 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[9px] font-mono font-bold rounded-md border border-purple-200 dark:border-purple-900 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Tenant #{p.tenantId}
                        </span>

                        {p.isDefault && (
                          <span className="px-2 py-0.3 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[9px] font-extrabold rounded-md border border-blue-200 dark:border-blue-900">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">{p.providerCode} Provider • Profile ID #{p.id}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {test && (
                      <div className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border ${test.isSuccess ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                        {test.isSuccess ? `✓ Connected (${test.latencyMs}ms)` : '✕ Connection Error'}
                      </div>
                    )}

                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
                      title="Edit Storage Profile"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleTestConnection(p.id)}
                      disabled={testingId === p.id}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingId === p.id ? 'animate-spin' : ''}`} />
                      <span>{testingId === p.id ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
          onPageChange={(p) => setPageIndex(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPageIndex(1);
          }}
        />
      </div>

      {/* 🔗 Application to Storage Profile Links (Routing Rules Table) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-xs flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
          <span className="flex items-center gap-2">
            <Link className="w-4 h-4 text-purple-600" />
            <span>Application ➔ Storage Profile Links (Routing Rules)</span>
          </span>
          <button
            onClick={() => setIsRuleModalOpen(true)}
            className="text-[10px] text-purple-600 hover:underline font-bold flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Application Link
          </button>
        </div>

        {routingRules.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            No specific application routing links created. Uploads default to each Tenant's Primary Default Storage.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Application 📱</th>
                  <th className="p-3 text-center">Routing ➔</th>
                  <th className="p-3">Target Storage Profile ☁️</th>
                  <th className="p-3">Module / Entity 🏷️</th>
                  <th className="p-3 text-center">Priority ⚡</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {routingRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <AppWindow className="w-4 h-4 text-purple-600 shrink-0" />
                      <div>
                        <div>{rule.applicationName || 'All Applications (Global)'}</div>
                        {rule.applicationCode && (
                          <div className="text-[9px] font-mono text-purple-600 dark:text-purple-400">{rule.applicationCode}</div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center text-slate-400">
                      <ArrowRight className="w-4 h-4 inline" />
                    </td>
                    <td className="p-3 font-bold text-blue-600 dark:text-blue-400">
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-md">
                        ☁️ {rule.storageProfileName}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">
                      {rule.moduleCode ? `${rule.moduleCode} ${rule.entityType ? `(${rule.entityType})` : ''}` : 'Any Module'}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-500">
                      #{rule.priority}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition-colors"
                        title="Delete Link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-4 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                {editingProfile ? <Pencil className="w-4 h-4 text-purple-600" /> : <Server className="w-4 h-4 text-blue-600" />}
                <span>{editingProfile ? `Edit Storage Profile #${editingProfile.id}` : 'Add New Storage Profile'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Tenant *</label>
                <select
                  value={targetTenantId}
                  onChange={(e) => setTargetTenantId(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
                >
                  {tenants.length === 0 ? (
                    <option value={1}>Tenant #1 (TENANT_A)</option>
                  ) : (
                    tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        🏢 {t.tenantCode} — {t.tenantName} (Tenant #{t.id})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Profile Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Profile Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Provider Type</label>
                <select
                  value={providerCode}
                  onChange={(e) => handleProviderSelect(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
                >
                  <option value="LOCAL">📁 Local Disk Storage</option>
                  <option value="AWS_S3">☁️ Amazon S3 Bucket</option>
                  <option value="AZURE_BLOB">🟦 Azure Blob Storage</option>
                  <option value="GOOGLE_DRIVE">📁 Google Drive Storage</option>
                  <option value="LOCAL_AGENT">🖥️ On-Premises Local Agent</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Provider Configuration JSON</label>
                <textarea
                  rows={4}
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isDefault" className="font-semibold text-slate-700 dark:text-slate-300">Set as Default Storage Profile for this Tenant</label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white font-bold rounded-lg shadow-xs">
                  {editingProfile ? 'Update Profile' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔗 Link Application to Storage Profile Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-4 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Link className="w-4 h-4 text-purple-600" />
                <span>Link Application to Storage Profile</span>
              </h3>
              <button onClick={() => setIsRuleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoutingRule} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Consuming Application *</label>
                <select
                  value={ruleAppId}
                  onChange={(e) => setRuleAppId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
                >
                  <option value="">-- All Applications (Global Fallback) --</option>
                  {apps.map((a) => (
                    <option key={a.id} value={a.id}>
                      📱 {a.applicationName} ({a.applicationCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Storage Profile *</label>
                <select
                  required
                  value={ruleProfileId}
                  onChange={(e) => setRuleProfileId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
                >
                  <option value="">-- Select Target Storage Profile --</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      ☁️ {p.name} ({p.providerCode} • Tenant #{p.tenantId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Optional Module Filter</label>
                <select
                  value={ruleModuleCode}
                  onChange={(e) => setRuleModuleCode(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                >
                  <option value="">-- All Modules (Global Route) --</option>
                  {Array.isArray(modules) && modules.map((m) => (
                    <option key={m.id} value={m.moduleCode}>
                      {m.moduleCode} — {m.moduleName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsRuleModalOpen(false)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-purple-600 text-white font-bold rounded-lg shadow-xs">
                  Create Link Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
