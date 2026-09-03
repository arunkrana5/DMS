import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Building2, Plus, Search, Users, CheckCircle2, AlertCircle, X, ShieldCheck, Pencil, Trash2 } from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';

interface TenantItem {
  id: number;
  publicId: string;
  tenantCode: string;
  tenantName: string;
  description: string;
  contactEmail: string;
  primaryColor: string;
  isActive: boolean;
  createdDate: string;
  userCount: number;
  appCount: number;
}

interface UserItem {
  id: number;
  tenantId: number;
  username: string;
  email: string;
  fullName: string;
  roleName: string;
  isActive: boolean;
  createdDate: string;
}

export const TenantsView: React.FC = () => {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Tenant Users Drawer/Modal
  const [selectedTenant, setSelectedTenant] = useState<TenantItem | null>(null);
  const [tenantUsers, setTenantUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Create / Edit Tenant Modal State
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantItem | null>(null);
  const [tenantCode, setTenantCode] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [description, setDescription] = useState('');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('Password123!');
  const [submitting, setSubmitting] = useState(false);

  // Create User Modal State
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [userPassword, setUserPassword] = useState('Password123!');
  const [userEmail, setUserEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleCode, setRoleCode] = useState('USER');

  // Notification Banner State
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tenants?pageIndex=${pageIndex}&pageSize=${pageSize}&search=${encodeURIComponent(searchQuery)}`);
      if (res.data?.success) {
        setTenants(res.data.data.items || []);
        setTotalCount(res.data.data.totalCount || 0);
        setTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [pageIndex, pageSize, searchQuery]);

  const fetchTenantUsers = async (tenantId: number) => {
    setLoadingUsers(true);
    try {
      const res = await api.get(`/users?tenantId=${tenantId}&pageSize=100`);
      if (res.data?.success) {
        setTenantUsers(res.data.data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenTenantUsers = (tenant: TenantItem) => {
    setSelectedTenant(tenant);
    fetchTenantUsers(tenant.id);
  };

  const handleOpenAddTenant = () => {
    setEditingTenant(null);
    setTenantCode('');
    setTenantName('');
    setContactEmail('');
    setDescription('');
    setAdminUsername('admin');
    setAdminPassword('Password123!');
    setIsTenantModalOpen(true);
  };

  const handleOpenEditTenant = (tenant: TenantItem) => {
    setEditingTenant(tenant);
    setTenantCode(tenant.tenantCode);
    setTenantName(tenant.tenantName);
    setContactEmail(tenant.contactEmail || '');
    setDescription(tenant.description || '');
    setIsTenantModalOpen(true);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingTenant) {
        // Edit existing
        const res = await api.put(`/tenants/${editingTenant.id}`, {
          tenantName: tenantName.trim(),
          contactEmail: contactEmail.trim(),
          description: description.trim(),
          isActive: true
        });

        if (res.data?.success) {
          setSuccessMsg(`Tenant '${tenantName}' updated successfully.`);
          setTimeout(() => setSuccessMsg(null), 4000);
          setIsTenantModalOpen(false);
          fetchTenants();
        }
      } else {
        // Create new
        if (!tenantCode.trim()) return;
        const res = await api.post('/tenants', {
          tenantCode: tenantCode.trim().toUpperCase(),
          tenantName: tenantName.trim(),
          contactEmail: contactEmail.trim(),
          description: description.trim(),
          adminUsername: adminUsername.trim(),
          adminPassword
        });

        if (res.data?.success) {
          setSuccessMsg(`Tenant '${tenantName}' created successfully.`);
          setTimeout(() => setSuccessMsg(null), 4000);
          setIsTenantModalOpen(false);
          fetchTenants();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save tenant.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTenant = async (id: number, code: string) => {
    if (!window.confirm(`Are you sure you want to delete tenant '${code}'? All tenant users and data will be removed.`)) return;

    try {
      const res = await api.delete(`/tenants/${id}`);
      if (res.data?.success) {
        setSuccessMsg(`Tenant '${code}' deleted successfully.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchTenants();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete tenant.');
    }
  };

  const handleDeleteUser = async (tenantId: number, userId: number, uname: string) => {
    if (!window.confirm(`Remove user '${uname}' from this tenant?`)) return;

    try {
      const res = await api.delete(`/tenants/${tenantId}/users/${userId}`);
      if (res.data?.success) {
        setSuccessMsg(`User '${uname}' removed successfully.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchTenantUsers(tenantId);
        fetchTenants();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove user.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant || !username.trim()) return;

    setErrorMsg(null);
    try {
      const res = await api.post('/users', {
        tenantId: selectedTenant.id,
        username: username.trim(),
        password: userPassword,
        email: userEmail.trim(),
        fullName: fullName.trim(),
        roleCode
      });

      if (res.data?.success) {
        setSuccessMsg(`User '${username}' created for tenant '${selectedTenant.tenantCode}'.`);
        setTimeout(() => setSuccessMsg(null), 4000);
        setIsCreateUserOpen(false);
        setUsername('');
        setUserEmail('');
        setFullName('');
        fetchTenantUsers(selectedTenant.id);
        fetchTenants();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create user.');
    }
  };

  return (
    <div className="w-full space-y-3.5 text-xs font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              Tenants & User Management
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenant code, name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <button
            onClick={handleOpenAddTenant}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Tenant</span>
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

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading enterprise tenants...</div>
        ) : tenants.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">No tenants created yet. Click "Create New Tenant" to provision a tenant workspace.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr className="whitespace-nowrap">
                  <th className="px-4 py-3">Tenant Code</th>
                  <th className="px-4 py-3">Organization Name</th>
                  <th className="px-4 py-3">Contact Email</th>
                  <th className="px-4 py-3">Users</th>
                  <th className="px-4 py-3">Apps</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-extrabold font-mono text-indigo-600 dark:text-indigo-400 text-xs">
                      <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 rounded-md">
                        {t.tenantCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-slate-900 dark:text-white">{t.tenantName}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{t.description || 'Enterprise tenant namespace'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {t.contactEmail || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold border border-blue-200 dark:border-blue-900 shadow-xs">
                        {t.userCount} users
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg text-[10px] font-bold border border-purple-200 dark:border-purple-900 shadow-xs">
                        {t.appCount} apps
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] rounded-full border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Active
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenTenantUsers(t)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs"
                          title="Manage Tenant Users"
                        >
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Users ({t.userCount})</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditTenant(t)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Edit Tenant"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {t.tenantCode !== 'SUPERADMIN' && (
                          <button
                            onClick={() => handleDeleteTenant(t.id, t.tenantCode)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete Tenant"
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

      {/* Create / Edit Tenant Modal */}
      {isTenantModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-animate bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden space-y-0 text-xs">
            <div className="p-4 bg-gradient-to-r from-indigo-900/40 to-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {editingTenant ? `Edit Tenant: ${editingTenant.tenantCode}` : 'Provision Enterprise Tenant'}
                  </h3>
                </div>
              </div>
              <button onClick={() => setIsTenantModalOpen(false)} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="p-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tenant Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingTenant}
                    placeholder="Enter Tenant Code"
                    value={tenantCode}
                    onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs uppercase font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Organization Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Organization Name"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="admin@thrivera.co"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {!editingTenant && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300">Initial Admin Credentials</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Username</label>
                      <input
                        type="text"
                        required
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Password</label>
                      <input
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Enter Tenant Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTenantModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingTenant ? 'Update Tenant' : 'Provision Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Tenant Users Modal / Drawer */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-animate bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Tenant Users: {selectedTenant.tenantName} ({selectedTenant.tenantCode})
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setUsername('');
                    setUserEmail('');
                    setFullName('');
                    setUserPassword('Password123!');
                    setIsCreateUserOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add User</span>
                </button>
                <button onClick={() => setSelectedTenant(null)} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {loadingUsers ? (
                <div className="p-8 text-center text-slate-400">Loading tenant users...</div>
              ) : tenantUsers.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No users found for this tenant. Click "Add User" to create a user.</div>
              ) : (
                <div className="overflow-x-auto max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="px-3.5 py-2">Username</th>
                        <th className="px-3.5 py-2">Full Name</th>
                        <th className="px-3.5 py-2">Email</th>
                        <th className="px-3.5 py-2">Role</th>
                        <th className="px-3.5 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {tenantUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="px-3.5 py-2 font-mono font-bold text-blue-600 dark:text-blue-400">{u.username}</td>
                          <td className="px-3.5 py-2 font-semibold text-slate-900 dark:text-white">{u.fullName || '—'}</td>
                          <td className="px-3.5 py-2 font-mono text-[11px] text-slate-500">{u.email}</td>
                          <td className="px-3.5 py-2">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold rounded-md border border-slate-200 dark:border-slate-700">
                              {u.roleName}
                            </span>
                          </td>
                          <td className="px-3.5 py-2 text-right">
                            <button
                              onClick={() => handleDeleteUser(selectedTenant.id, u.id, u.username)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                              title="Remove User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isCreateUserOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-animate bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-gradient-to-r from-blue-900/40 to-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Add User to {selectedTenant.tenantCode}
                  </h3>
                </div>
              </div>
              <button onClick={() => setIsCreateUserOpen(false)} className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 space-y-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter Password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="Arun Rana"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Role Code</label>
                  <select
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="USER">USER</option>
                    <option value="AUDITOR">AUDITOR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="user@tenant.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
