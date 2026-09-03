import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Search, Plus, Globe, X, CheckCircle2, AlertCircle, Pencil, Trash2, Building2 } from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';

interface TenantItem {
  id: number;
  tenantCode: string;
  tenantName: string;
}

interface WebhookItem {
  id: number;
  tenantId: number;
  eventType: string;
  endpoint: string;
  isActive: boolean;
  createdDate: string;
}

export const WebhooksView: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // SuperAdmin detection
  const userStr = localStorage.getItem('dms_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isSuperAdmin =
    user?.roles?.includes('SUPERADMIN') ||
    user?.tenantCode === 'SUPERADMIN' ||
    localStorage.getItem('dms_role') === 'SUPERADMIN';

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookItem | null>(null);
  const [targetTenantId, setTargetTenantId] = useState<number>(0);
  const [eventType, setEventType] = useState('DocumentUploaded');
  const [endpoint, setEndpoint] = useState('');
  const [secretKey, setSecretKey] = useState('dms_secret_key');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/webhooks?pageIndex=${pageIndex}&pageSize=${pageSize}&search=${encodeURIComponent(searchQuery)}`);
      if (res.data.success) {
        setWebhooks(res.data.data.items || []);
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
    if (!isSuperAdmin) return;
    try {
      const res = await api.get('/tenants');
      if (res.data?.success) {
        const list = res.data.data.items || res.data.data || [];
        setTenants(list);
        if (list.length > 0 && !targetTenantId) {
          setTargetTenantId(list[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, [pageIndex, pageSize, searchQuery]);

  useEffect(() => {
    fetchTenants();
  }, [isSuperAdmin]);

  const getTenantCode = (tId: number) => {
    const t = tenants.find((item) => item.id === tId);
    return t ? t.tenantCode : `Tenant #${tId}`;
  };

  const handleOpenAdd = () => {
    setEditingWebhook(null);
    if (tenants.length > 0) setTargetTenantId(tenants[0].id);
    setEventType('DocumentUploaded');
    setEndpoint('');
    setSecretKey('dms_secret_key');
    setIsActive(true);
    setIsOpen(true);
  };

  const handleOpenEdit = (w: WebhookItem) => {
    setEditingWebhook(w);
    setTargetTenantId(w.tenantId);
    setEventType(w.eventType);
    setEndpoint(w.endpoint);
    setSecretKey('dms_secret_key');
    setIsActive(w.isActive);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endpoint.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingWebhook) {
        // Edit existing
        const res = await api.put(`/webhooks/${editingWebhook.id}`, {
          eventType,
          endpoint: endpoint.trim(),
          secretKey,
          isActive
        });

        if (res.data.success) {
          setSuccessMsg(`Webhook subscription updated successfully.`);
          setTimeout(() => setSuccessMsg(null), 4000);
          setIsOpen(false);
          fetchWebhooks();
        }
      } else {
        // Create new
        const res = await api.post('/webhooks', {
          tenantId: isSuperAdmin ? targetTenantId : undefined,
          eventType,
          endpoint: endpoint.trim(),
          secretKey
        });

        if (res.data.success) {
          setSuccessMsg(`Webhook subscription for '${eventType}' registered.`);
          setTimeout(() => setSuccessMsg(null), 4000);
          setIsOpen(false);
          fetchWebhooks();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save webhook subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, event: string) => {
    if (!window.confirm(`Are you sure you want to delete webhook subscription for '${event}'?`)) return;

    try {
      const res = await api.delete(`/webhooks/${id}`);
      if (res.data?.success) {
        setSuccessMsg(`Webhook subscription deleted successfully.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchWebhooks();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete webhook.');
    }
  };

  return (
    <div className="space-y-3.5 max-w-[1600px] mx-auto text-xs font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            <span>Webhooks</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search event or endpoint..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Subscription</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Webhooks Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading webhooks...</div>
        ) : webhooks.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No webhooks registered yet. Click "+ Add Subscription" to register your endpoint.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  {isSuperAdmin && <th className="px-4 py-2.5">Tenant</th>}
                  <th className="px-4 py-2.5">Event Type</th>
                  <th className="px-4 py-2.5">Endpoint URL</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {webhooks.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    {isSuperAdmin && (
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold rounded-md border border-indigo-200 dark:border-indigo-800">
                          {getTenantCode(w.tenantId)}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-2.5 font-bold text-blue-600 dark:text-blue-400 font-mono text-[11px]">{w.eventType}</td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-slate-600 dark:text-slate-300">{w.endpoint}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                          w.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {w.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(w)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Edit Webhook"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(w.id, w.eventType)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete Webhook"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-4 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-500" />
                <span>{editingWebhook ? 'Edit Webhook Endpoint' : 'Register Webhook Endpoint'}</span>
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              {/* Target Tenant Selector (Only for SuperAdmin) */}
              {isSuperAdmin && !editingWebhook && tenants.length > 0 && (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-blue-600" /> Target Tenant *
                  </label>
                  <select
                    value={targetTenantId}
                    onChange={(e) => setTargetTenantId(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        🏢 {t.tenantCode} — {t.tenantName} (Tenant #{t.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Event Type *</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                >
                  <option value="DocumentUploaded">DocumentUploaded</option>
                  <option value="DocumentDeleted">DocumentDeleted</option>
                  <option value="DocumentVersionCreated">DocumentVersionCreated</option>
                  <option value="StorageMigrationCompleted">StorageMigrationCompleted</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Endpoint URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://myclientapp.com/api/webhook"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Secret Signature Key</label>
                <input
                  type="text"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                />
              </div>

              {editingWebhook && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">Active</span>
                  </label>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-semibold">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50">
                  {submitting ? 'Saving...' : editingWebhook ? 'Update Subscription' : 'Register Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
