import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  ShieldCheck,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Building2,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';

interface PermissionItem {
  id: number;
  permissionCode: string;
  permissionName: string;
  category: string;
  description?: string;
}

interface RoleItem {
  id: number;
  publicId: string;
  tenantId: number;
  roleCode: string;
  roleName: string;
  description?: string;
  isActive: boolean;
  permissionIds: number[];
  permissionCodes: string[];
  createdDate: string;
}

export const RolesView: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [roleCode, setRoleCode] = useState('');
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [targetTenantId, setTargetTenantId] = useState<number | ''>('');
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTenants = async () => {
    try {
      const res = await api.get('/tenants?pageSize=100');
      if (res.data?.success) {
        setTenants(res.data.data.items || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/roles/permissions');
      if (res.data?.success) {
        setPermissions(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/roles?pageIndex=${pageIndex}&pageSize=${pageSize}&search=${encodeURIComponent(searchQuery)}`);
      if (res.data?.success) {
        setRoles(res.data.data.items || []);
        setTotalCount(res.data.data.totalCount || 0);
        setTotalPages(res.data.data.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchPermissions();
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [pageIndex, pageSize, searchQuery]);

  const handleOpenAdd = () => {
    setEditingRole(null);
    setRoleCode('');
    setRoleName('');
    setDescription('');
    setTargetTenantId('');
    setSelectedPermIds([]);
    setIsActive(true);
    setErrorMsg(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (r: RoleItem) => {
    setEditingRole(r);
    setRoleCode(r.roleCode);
    setRoleName(r.roleName);
    setDescription(r.description || '');
    setTargetTenantId(r.tenantId);
    setSelectedPermIds(r.permissionIds || []);
    setIsActive(r.isActive);
    setErrorMsg(null);
    setIsOpen(true);
  };

  const handleTogglePermission = (id: number) => {
    setSelectedPermIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!roleCode.trim() || !roleName.trim()) {
      setErrorMsg('Role Code and Role Name are required.');
      return;
    }

    try {
      let res;
      if (editingRole) {
        res = await api.put(`/roles/${editingRole.id}`, {
          roleName,
          description,
          isActive,
          permissionIds: selectedPermIds
        });
      } else {
        res = await api.post('/roles', {
          tenantId: targetTenantId !== '' ? targetTenantId : undefined,
          roleCode: roleCode.trim().toUpperCase(),
          roleName: roleName.trim(),
          description,
          permissionIds: selectedPermIds
        });
      }

      if (res.data?.success) {
        setSuccessMsg(`Role '${roleName}' ${editingRole ? 'updated' : 'created'} successfully.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        setIsOpen(false);
        fetchRoles();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save role.');
    }
  };

  const handleDeleteRole = async (r: RoleItem) => {
    if (r.roleCode === 'SUPERADMIN') {
      alert('Cannot delete system SUPERADMIN role.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete role '${r.roleName}'?`)) return;

    try {
      await api.delete(`/roles/${r.id}`);
      setSuccessMsg(`Role '${r.roleName}' deleted.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchRoles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete role.');
    }
  };

  const getTenantBadge = (tId: number) => {
    const t = tenants.find((item) => item.id === tId);
    return t ? t.tenantCode : `Tenant #${tId}`;
  };

  // Group permissions by category for modal checklist
  const categories = Array.from(new Set(permissions.map((p) => p.category)));

  return (
    <div className="w-full space-y-3.5 text-xs font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              Roles & Permissions
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search role code, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <button
            onClick={fetchRoles}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
            title="Refresh Roles"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Role</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading security roles & permissions...</div>
        ) : roles.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">No roles created yet. Click "Create New Role" to define a role.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr className="whitespace-nowrap">
                  <th className="px-4 py-3">Role Code 🏷️</th>
                  <th className="px-4 py-3">Role Name 🛡️</th>
                  <th className="px-4 py-3">Tenant Namespace 🏢</th>
                  <th className="px-4 py-3">Assigned Permissions 🔑</th>
                  <th className="px-4 py-3">Status ⚡</th>
                  <th className="px-4 py-3 text-right">Actions ⚙️</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {roles.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {r.roleCode}
                    </td>

                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {r.roleName}
                      <p className="text-[10px] font-normal text-slate-400 truncate max-w-xs">{r.description || 'No description'}</p>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono font-bold text-[10px] rounded-lg border border-purple-200 dark:border-purple-900 inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-purple-500" />
                        <span>{getTenantBadge(r.tenantId)}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3 max-w-md">
                      <div className="flex flex-wrap gap-1">
                        {r.permissionCodes && r.permissionCodes.length > 0 ? (
                          r.permissionCodes.slice(0, 6).map((code) => (
                            <span key={code} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[9px] font-bold rounded border border-slate-200 dark:border-slate-700">
                              {code}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No permissions assigned</span>
                        )}
                        {r.permissionCodes && r.permissionCodes.length > 6 && (
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-mono text-[9px] font-extrabold rounded">
                            +{r.permissionCodes.length - 6} more
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 font-bold text-[10px] rounded-lg border ${
                        r.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {r.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Edit Role & Permissions"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {r.roleCode !== 'SUPERADMIN' && (
                          <button
                            onClick={() => handleDeleteRole(r)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete Role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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

      {/* Role Creation / Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-animate bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-xs font-bold">{editingRole ? `Edit Role: ${editingRole.roleName}` : 'Create New Security Role'}</h3>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="flex-1 overflow-y-auto p-4 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Role Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingRole}
                    placeholder="Enter Role Code"
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Role Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Role Display Name"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {!editingRole && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Target Tenant Workspace
                  </label>
                  <select
                    value={targetTenantId}
                    onChange={(e) => setTargetTenantId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Current Tenant Default</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tenantCode} - {t.tenantName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Description / Remarks
                </label>
                <input
                  type="text"
                  placeholder="Operational role duties..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Permissions Checkbox Matrix */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Assign Capabilities & Permissions ({selectedPermIds.length} Selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPermIds.length === permissions.length) setSelectedPermIds([]);
                      else setSelectedPermIds(permissions.map((p) => p.id));
                    }}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {selectedPermIds.length === permissions.length ? 'Deselect All' : 'Select All Permissions'}
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const catPerms = permissions.filter((p) => p.category === cat);
                    return (
                      <div key={cat} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                        <div className="font-bold text-[10px] uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                          {cat} Module
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catPerms.map((p) => {
                            const isChecked = selectedPermIds.includes(p.id);
                            return (
                              <label
                                key={p.id}
                                className={`flex items-start gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                                  isChecked
                                    ? 'bg-indigo-50/60 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-100'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(p.id)}
                                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                <div>
                                  <div className="font-bold text-xs leading-tight">{p.permissionName}</div>
                                  <div className="font-mono text-[9px] text-slate-400">{p.permissionCode}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-300">Active Status</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-md transition-all"
                  >
                    {editingRole ? 'Save Changes' : 'Create Role'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
