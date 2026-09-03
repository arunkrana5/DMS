import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { FileCode, Search, Plus, X, CheckCircle2, AlertCircle, Building2, Pencil, Trash2 } from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';

interface TenantItem {
  id: number;
  tenantCode: string;
  tenantName: string;
}

interface DocumentTypeItem {
  id: number;
  tenantId: number;
  typeCode: string;
  typeName: string;
  description?: string;
  moduleCode?: string;
  allowedExtensions: string;
  maxFileSizeBytes: number;
  isMandatory: boolean;
  isActive: boolean;
}

export const DocumentTypesView: React.FC = () => {
  const [types, setTypes] = useState<DocumentTypeItem[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modules List for Dropdown
  const [modules, setModules] = useState<any[]>([]);

  // SuperAdmin detection
  const userStr = localStorage.getItem('dms_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isSuperAdmin =
    user?.roles?.includes('SUPERADMIN') ||
    user?.tenantCode === 'SUPERADMIN' ||
    localStorage.getItem('dms_role') === 'SUPERADMIN';

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingType, setEditingType] = useState<DocumentTypeItem | null>(null);
  const [targetTenantId, setTargetTenantId] = useState<number>(0);
  const [typeCode, setTypeCode] = useState('');
  const [typeName, setTypeName] = useState('');
  const [moduleCode, setModuleCode] = useState('GENERAL');
  const [isMandatory, setIsMandatory] = useState(true);
  const [allowedExtensions, setAllowedExtensions] = useState('.pdf,.docx,.jpg,.png');
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(100);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/document-types?pageIndex=${pageIndex}&pageSize=${pageSize}&search=${encodeURIComponent(searchQuery)}`);
      if (res.data.success) {
        setTypes(res.data.data.items || []);
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
    fetchTypes();
  }, [pageIndex, pageSize, searchQuery]);

  useEffect(() => {
    api.get('/tenant-modules?pageSize=100').then((res) => {
      if (res.data?.success) {
        const data = res.data.data;
        const list = Array.isArray(data) ? data : (data?.items || []);
        setModules(list);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [isSuperAdmin]);

  const getTenantCode = (tId: number) => {
    const t = tenants.find((item) => item.id === tId);
    return t ? t.tenantCode : `Tenant #${tId}`;
  };

  const handleOpenAdd = () => {
    setEditingType(null);
    if (tenants.length > 0) setTargetTenantId(tenants[0].id);
    setTypeCode('');
    setTypeName('');
    setDescription('');
    setModuleCode('GENERAL');
    setIsMandatory(true);
    setAllowedExtensions('.pdf,.docx,.jpg,.png');
    setMaxFileSizeMb(100);
    setIsOpen(true);
  };

  const handleOpenEdit = (t: DocumentTypeItem) => {
    setEditingType(t);
    setTargetTenantId(t.tenantId);
    setTypeCode(t.typeCode);
    setTypeName(t.typeName);
    setDescription(t.description || '');
    setModuleCode(t.moduleCode || 'GENERAL');
    setIsMandatory(t.isMandatory);
    setAllowedExtensions(t.allowedExtensions || '.pdf,.docx,.jpg,.png');
    setMaxFileSizeMb(Math.round((t.maxFileSizeBytes || 104857600) / 1048576));
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingType) {
        // Edit existing
        const res = await api.put(`/document-types/${editingType.id}`, {
          typeName: typeName.trim(),
          moduleCode: moduleCode.trim().toUpperCase(),
          allowedExtensions,
          maxFileSizeBytes: maxFileSizeMb * 1048576,
          isMandatory,
          description: description.trim(),
          isActive: true
        });

        if (res.data.success) {
          setSuccessMsg(`Document Type '${typeName}' updated successfully.`);
          setTimeout(() => setSuccessMsg(null), 4000);
          setIsOpen(false);
          fetchTypes();
        }
      } else {
        // Create new
        if (!typeCode.trim()) return;
        const res = await api.post('/document-types', {
          tenantId: isSuperAdmin ? targetTenantId : undefined,
          typeCode: typeCode.trim().toUpperCase(),
          typeName: typeName.trim(),
          moduleCode: moduleCode.trim().toUpperCase(),
          isMandatory,
          allowedExtensions,
          maxFileSizeBytes: maxFileSizeMb * 1048576,
          description: description.trim()
        });

        if (res.data.success) {
          setSuccessMsg(`Document Type '${typeName}' created successfully.`);
          setTimeout(() => setSuccessMsg(null), 4000);
          setIsOpen(false);
          fetchTypes();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save document type.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete document type '${name}'?`)) return;

    try {
      const res = await api.delete(`/document-types/${id}`);
      if (res.data?.success) {
        setSuccessMsg(`Document Type '${name}' deleted successfully.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchTypes();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete document type.');
    }
  };

  return (
    <div className="space-y-3.5 max-w-[1600px] mx-auto text-xs font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-500" />
            <span>Document Types</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search type or code..."
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
            <span>New Document Type</span>
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

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading document types...</div>
        ) : types.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No document types configured yet. Click "New Document Type" to create one.</div>
        ) : (
          <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {types.map((t) => (
              <div key={t.id} className="p-3.5 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold shrink-0 border border-blue-200 dark:border-blue-800">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-white text-xs truncate">{t.typeName}</div>
                        <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400">{t.typeCode}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {t.isMandatory ? (
                        <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-[10px] rounded-full border border-rose-200">
                          Required
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium text-[10px] rounded-full">
                          Optional
                        </span>
                      )}
                      {isSuperAdmin && (
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold text-[9px] rounded-md border border-indigo-200 dark:border-indigo-800">
                          {getTenantCode(t.tenantId)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <div>Module: <span className="font-mono text-slate-900 dark:text-white font-bold">{t.moduleCode || 'GLOBAL'}</span></div>
                    <div>Allowed Ext: <span className="font-mono text-slate-900 dark:text-white font-bold">{t.allowedExtensions}</span></div>
                    <div>Max Size: <span className="font-mono text-slate-900 dark:text-white font-bold">{(t.maxFileSizeBytes / 1048576).toFixed(0)} MB</span></div>
                  </div>
                </div>

                {/* Card Action Buttons (Edit & Delete) */}
                <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] rounded-lg transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-800"
                    title="Edit Document Type"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(t.id, t.typeName)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-[10px] rounded-lg transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-800"
                    title="Delete Document Type"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
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
                <FileCode className="w-4 h-4 text-blue-500" />
                <span>{editingType ? `Edit Document Type: ${editingType.typeCode}` : 'Create New Document Type'}</span>
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              {/* Target Tenant Selector (Only for SuperAdmin) */}
              {isSuperAdmin && !editingType && tenants.length > 0 && (
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
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Type Code *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingType}
                  placeholder="Enter Type Code"
                  value={typeCode}
                  onChange={(e) => setTypeCode(e.target.value.toUpperCase())}
                  className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs uppercase disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Type Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Type Name"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Module Code *</label>
                <select
                  value={moduleCode}
                  onChange={(e) => setModuleCode(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs font-bold uppercase"
                >
                  <option value="GENERAL">GENERAL — General Default</option>
                  {Array.isArray(modules) && modules.map((m) => (
                    <option key={m.id} value={m.moduleCode}>
                      {m.moduleCode} — {m.moduleName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Allowed Extensions</label>
                  <input
                    type="text"
                    value={allowedExtensions}
                    onChange={(e) => setAllowedExtensions(e.target.value)}
                    placeholder=".pdf,.docx,.jpg"
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Max Size (MB)</label>
                  <input
                    type="number"
                    value={maxFileSizeMb}
                    onChange={(e) => setMaxFileSizeMb(Number(e.target.value))}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-[11px]">Option A: Mandatory Document?</div>
                  <div className="text-[10px] text-slate-400">Atomic uploads reject if missing</div>
                </div>
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-xs cursor-pointer disabled:opacity-50">
                  {submitting ? 'Saving...' : editingType ? 'Update Document Type' : 'Create Document Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
