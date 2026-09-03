import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  AppWindow,
  ShieldCheck,
  Search,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Key,
  Cloud,
  Building2,
  Pencil
} from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';

export const ApplicationsView: React.FC = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [routingRules, setRoutingRules] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Visible Tokens & Copied States
  const [visibleTokens, setVisibleTokens] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [targetTenantId, setTargetTenantId] = useState<number | ''>('');
  const [applicationName, setApplicationName] = useState('');
  const [applicationCode, setApplicationCode] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/applications?pageIndex=${pageIndex}&pageSize=${pageSize}&search=${encodeURIComponent(searchQuery)}`);
      if (res.data?.success) {
        setApps(res.data.data.items || []);
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
        if (items.length > 0 && !targetTenantId) setTargetTenantId(items[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStorageInfo = async () => {
    try {
      const [rulesRes, profilesRes] = await Promise.all([
        api.get('/storage/routing-rules'),
        api.get('/storage/profiles?pageSize=100')
      ]);
      if (rulesRes.data?.success) setRoutingRules(rulesRes.data.data || []);
      if (profilesRes.data?.success) setProfiles(profilesRes.data.data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchApps();
    fetchTenants();
    fetchStorageInfo();
  }, [pageIndex, pageSize, searchQuery]);

  const toggleTokenVisibility = (id: number) => {
    setVisibleTokens((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getMasterToken = (app: any) => {
    const secretHash = btoa(`${app.id}:${app.applicationCode}:${app.tenantId}`).replace(/=/g, '');
    return `dms_app_live_${app.applicationCode.toLowerCase()}_${secretHash}x9f`;
  };

  const copyToClipboard = (app: any) => {
    const token = getMasterToken(app);
    navigator.clipboard.writeText(token);
    setCopiedId(app.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLinkedStorageInfo = (app: any) => {
    const rule = routingRules.find((r) => r.applicationId === app.id);
    if (rule) {
      return {
        name: rule.storageProfileName,
        isCustomRule: true,
        moduleCode: rule.moduleCode
      };
    }

    const defaultProfile = profiles.find((p) => p.tenantId === app.tenantId && p.isDefault);
    if (defaultProfile) {
      return {
        name: defaultProfile.name,
        isCustomRule: false,
        moduleCode: null
      };
    }

    return {
      name: 'Tenant Default Storage',
      isCustomRule: false,
      moduleCode: null
    };
  };

  const getTenantName = (tId: number) => {
    const t = tenants.find((item) => item.id === tId);
    return t ? `${t.tenantCode} (${t.tenantName})` : `Tenant #${tId}`;
  };

  const handleOpenAddModal = () => {
    setEditingApp(null);
    setApplicationName('');
    setApplicationCode('');
    setDescription('');
    if (tenants.length > 0) setTargetTenantId(tenants[0].id);
    setIsOpen(true);
  };

  const handleOpenEditModal = (app: any) => {
    setEditingApp(app);
    setTargetTenantId(app.tenantId);
    setApplicationName(app.applicationName);
    setApplicationCode(app.applicationCode);
    setDescription(app.description || '');
    setIsOpen(true);
  };

  const handleSaveApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationName.trim() || !applicationCode.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        tenantId: targetTenantId ? Number(targetTenantId) : null,
        applicationName: applicationName.trim(),
        applicationCode: applicationCode.trim().toUpperCase(),
        description
      };

      let res;
      if (editingApp) {
        res = await api.put(`/applications/${editingApp.id}`, payload);
      } else {
        res = await api.post('/applications', payload);
      }

      if (res.data?.success) {
        setSuccessMsg(`Application '${applicationName}' ${editingApp ? 'updated' : 'registered'} successfully.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        setIsOpen(false);
        setEditingApp(null);
        setApplicationName('');
        setApplicationCode('');
        setDescription('');
        fetchApps();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-3.5 text-xs font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
            <AppWindow className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              Applications
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search app name, code or tenant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register App</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 📋 Enterprise Table List View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading registered applications...</div>
        ) : apps.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">No applications registered yet. Click "Register App" to register your application.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr className="whitespace-nowrap">
                  <th className="p-3.5 w-12 text-center">#</th>
                  <th className="p-3.5">Application 📱</th>
                  <th className="p-3.5">Assigned Tenant 🏢</th>
                  <th className="p-3.5">App Code 🏷️</th>
                  <th className="p-3.5">Linked Storage Profile ☁️</th>
                  <th className="p-3.5">Master Integration Token / API Key 🔑</th>
                  <th className="p-3.5 w-32 text-center">Status & Action 🛡️</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {apps.map((app, idx) => {
                  const token = getMasterToken(app);
                  const isVisible = !!visibleTokens[app.id];
                  const storageInfo = getLinkedStorageInfo(app);

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 text-center font-bold text-slate-400">{(pageIndex - 1) * pageSize + idx + 1}</td>
                      <td className="p-3.5 font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold shrink-0 border border-purple-200/80 dark:border-purple-800">
                          <AppWindow className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black">{app.applicationName}</div>
                          <div className="text-[9px] font-mono text-slate-400">App ID #{app.id}</div>
                        </div>
                      </td>

                      {/* 🏢 Assigned Tenant Column */}
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono font-bold text-[10px] rounded-lg border border-purple-200 dark:border-purple-900 inline-flex items-center gap-1.5 shadow-xs">
                          <Building2 className="w-3.5 h-3.5 text-purple-500" />
                          <span>{getTenantName(app.tenantId)}</span>
                        </span>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-purple-600 dark:text-purple-400">
                        <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900 rounded-md">
                          {app.applicationCode}
                        </span>
                      </td>

                      {/* ☁️ Linked Storage Profile Column */}
                      <td className="p-3.5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold rounded-lg border border-blue-200 dark:border-blue-900 shadow-xs">
                          <Cloud className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{storageInfo.name}</span>
                          {storageInfo.isCustomRule ? (
                            <span className="ml-1 text-[9px] font-mono px-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded font-bold">
                              Mapped
                            </span>
                          ) : (
                            <span className="ml-1 text-[9px] font-mono px-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded font-bold">
                              Default
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 🔑 Master Token Column */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[10px] max-w-sm">
                          <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate flex-1 font-semibold text-slate-800 dark:text-slate-200">
                            {isVisible ? token : `${token.substring(0, 16)}••••••••••••••••`}
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleTokenVisibility(app.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
                            title={isVisible ? 'Hide Token' : 'Show Token'}
                          >
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => copyToClipboard(app)}
                            className="px-2.5 py-0.5 bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-extrabold text-[9px] rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-600 transition-all shadow-xs cursor-pointer"
                            title="Copy Master Token"
                          >
                            {copiedId === app.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-blue-500" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] rounded-full border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Active
                          </span>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(app)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/60 rounded-lg transition-colors cursor-pointer"
                            title="Edit Assigned Tenant or App Details"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

      {/* MNC Professional Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-animate bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-purple-900/40 to-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md">
                  {editingApp ? <Pencil className="w-4 h-4" /> : <AppWindow className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {editingApp ? `Edit Application #${editingApp.id}` : 'Register Consuming Application'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveApp} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Target Assigned Tenant *</label>
                <select
                  value={targetTenantId}
                  onChange={(e) => setTargetTenantId(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      🏢 {t.tenantCode} — {t.tenantName} (Tenant #{t.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Application Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Application Name"
                    value={applicationName}
                    onChange={(e) => setApplicationName(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Application Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Application Code"
                    value={applicationCode}
                    onChange={(e) => setApplicationCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs uppercase font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Integration for Bluestar portal"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingApp ? 'Update Application' : 'Register Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
