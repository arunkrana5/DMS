import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Layers, Search, Plus, X, Edit2, Trash2, CheckCircle2, AlertCircle, RefreshCw, Building2 } from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';

interface TenantModuleItem {
  id: number;
  tenantId: number;
  moduleCode: string;
  moduleName: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
}

interface TenantItem {
  id: number;
  tenantCode: string;
  tenantName: string;
}

export const ModulesView: React.FC = () => {
  const [modules, setModules] = useState<TenantModuleItem[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
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
  const [editingModule, setEditingModule] = useState<TenantModuleItem | null>(null);
  const [targetTenantId, setTargetTenantId] = useState<number>(0);
  const [moduleCode, setModuleCode] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tenant-modules?pageIndex=${pageIndex}&pageSize=${pageSize}&search=${encodeURIComponent(searchQuery)}`);
      if (res.data?.success) {
        const pagedData = res.data.data;
        if (pagedData?.items) {
          setModules(pagedData.items || []);
          setTotalCount(pagedData.totalCount || 0);
          setTotalPages(pagedData.totalPages || 1);
        } else {
          setModules(res.data.data || []);
          setTotalCount((res.data.data || []).length);
          setTotalPages(1);
        }
      }
    } catch (err) {
      console.error('Failed to fetch modules', err);
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
      console.error('Failed to fetch tenants', err);
    }
  };

  useEffect(() => {
    fetchModules();
  }, [pageIndex, pageSize, searchQuery]);

  useEffect(() => {
    fetchTenants();
  }, [isSuperAdmin]);

  const getTenantCode = (tId: number) => {
    const t = tenants.find((item) => item.id === tId);
    return t ? t.tenantCode : `Tenant #${tId}`;
  };

  const handleOpenAdd = () => {
    setEditingModule(null);
    if (tenants.length > 0) setTargetTenantId(tenants[0].id);
    setModuleCode('');
    setModuleName('');
    setDescription('');
    setDisplayOrder(0);
    setIsActive(true);
    setIsOpen(true);
  };

  const handleOpenEdit = (mod: TenantModuleItem) => {
    setEditingModule(mod);
    setTargetTenantId(mod.tenantId);
    setModuleCode(mod.moduleCode);
    setModuleName(mod.moduleName);
    setDescription(mod.description || '');
    setDisplayOrder(mod.displayOrder || 0);
    setIsActive(mod.isActive);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleName.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingModule) {
        // Edit existing
        const res = await api.put(`/tenant-modules/${editingModule.id}`, {
          moduleName: moduleName.trim(),
          description: description.trim(),
          displayOrder,
          isActive
        });
        if (res.data?.success) {
          setSuccessMsg(`Module '${moduleName}' updated successfully.`);
          setTimeout(() => setSuccessMsg(null), 3000);
          setIsOpen(false);
          fetchModules();
        }
      } else {
        // Create new
        if (!moduleCode.trim()) return;
        const res = await api.post('/tenant-modules', {
          tenantId: isSuperAdmin ? targetTenantId : undefined,
          moduleCode: moduleCode.trim().toUpperCase(),
          moduleName: moduleName.trim(),
          description: description.trim(),
          displayOrder
        });
        if (res.data?.success) {
          setSuccessMsg(`Module '${moduleName}' created successfully.`);
          setTimeout(() => setSuccessMsg(null), 3000);
          setIsOpen(false);
          fetchModules();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save module.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, code: string) => {
    if (!window.confirm(`Are you sure you want to delete module '${code}'?`)) return;

    try {
      const res = await api.delete(`/tenant-modules/${id}`);
      if (res.data?.success) {
        setSuccessMsg(`Module '${code}' deleted successfully.`);
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchModules();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete module.');
    }
  };

  return (
    <div className="w-full space-y-3.5 text-xs font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              Module Master
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search module code or name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>

          <button
            onClick={fetchModules}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Refresh Modules"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Module</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid / Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading module master...</div>
        ) : modules.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">
            No business modules configured yet. Click "Create New Module" to define a domain module.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  {isSuperAdmin && <th className="px-4 py-3">Tenant</th>}
                  <th className="px-4 py-3">Module Code</th>
                  <th className="px-4 py-3">Module Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-center">Order</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {modules.map((mod) => (
                  <tr key={mod.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold rounded-md border border-indigo-200 dark:border-indigo-800">
                          {getTenantCode(mod.tenantId)}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono font-bold text-purple-600 dark:text-purple-400">
                      {mod.moduleCode}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {mod.moduleName}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {mod.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-500">
                      {mod.displayOrder}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          mod.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {mod.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(mod)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Edit Module"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(mod.id, mod.moduleCode)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete Module"
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

        {/* Server-Side Pagination Bar */}
        {!loading && totalCount > 0 && (
          <Pagination
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            onPageChange={setPageIndex}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPageIndex(1);
            }}
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-animate bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-gradient-to-r from-purple-900/40 to-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {editingModule ? `Edit Module: ${editingModule.moduleCode}` : 'Create Business Module'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3.5">
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Target Tenant Selector (Only for SuperAdmin) */}
              {isSuperAdmin && !editingModule && tenants.length > 0 && (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-purple-600" /> Target Tenant *
                  </label>
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
              )}

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Module Code *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingModule}
                  placeholder="Enter Module Code"
                  value={moduleCode}
                  onChange={(e) => setModuleCode(e.target.value.toUpperCase())}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-xs uppercase focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Module Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter Module Name"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                </div>

                {editingModule && (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                      Status
                    </label>
                    <label className="flex items-center gap-2 pt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-300">Active</span>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter Module Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingModule ? 'Update Module' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
