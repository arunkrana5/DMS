import React, { useState, useEffect } from 'react';
import { Pagination } from '../../components/common/Pagination';
import {
  Sliders,
  Plus,
  Search,
  KeyRound,
  HardDrive,
  Shield,
  Settings,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  Building2,
  Bell,
  Mail,
  X
} from 'lucide-react';
import api from '../../services/api';

interface ConfigSetting {
  id: number;
  publicId: string;
  tenantId: number | null;
  applicationId: number | null;
  category: string;
  settingKey: string;
  settingValue: string;
  dataType: string;
  isEncrypted: boolean;
  description: string;
  isActive: boolean;
}

export const ConfigSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<ConfigSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<ConfigSetting | null>(null);
  const [settingKey, setSettingKey] = useState('');
  const [settingValue, setSettingValue] = useState('');
  const [category, setCategory] = useState('STORAGE');
  const [dataType, setDataType] = useState('String');
  const [description, setDescription] = useState('');
  const [isTenantSpecific, setIsTenantSpecific] = useState(true);
  const [showValuesMap, setShowValuesMap] = useState<Record<number, boolean>>({});

  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/config-settings?pageIndex=${pageIndex}&pageSize=${pageSize}&category=${selectedCategory}&search=${encodeURIComponent(searchQuery)}`);
      if (response.data?.success) {
        setSettings(response.data.data.items || []);
        setTotalCount(response.data.data.totalCount || 0);
        setTotalPages(response.data.data.totalPages || 1);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch configuration settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [pageIndex, pageSize, selectedCategory, searchQuery]);

  const toggleShowValue = (id: number) => {
    setShowValuesMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAddModal = () => {
    setEditingSetting(null);
    setSettingKey('');
    setSettingValue('');
    setCategory('STORAGE');
    setDataType('String');
    setDescription('');
    setIsTenantSpecific(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ConfigSetting) => {
    setEditingSetting(item);
    setSettingKey(item.settingKey);
    setSettingValue(item.settingValue || '');
    setCategory(item.category || 'STORAGE');
    setDataType(item.dataType || 'String');
    setDescription(item.description || '');
    setIsTenantSpecific(item.tenantId !== null);
    setIsModalOpen(true);
  };

  const handleSaveSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        settingKey,
        settingValue,
        category,
        dataType,
        description,
        isTenantSpecific
      };

      let res;
      if (editingSetting) {
        res = await api.put(`/config-settings/${editingSetting.id}`, payload);
      } else {
        res = await api.post('/config-settings', payload);
      }

      if (res.data?.success) {
        setSuccessMsg(`Setting '${settingKey}' ${editingSetting ? 'updated' : 'created'} successfully.`);
        setTimeout(() => setSuccessMsg(null), 3000);
        setIsModalOpen(false);
        fetchSettings();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save configuration setting.');
    }
  };

  const handleDeleteSetting = async (item: ConfigSetting) => {
    if (!confirm(`Are you sure you want to delete setting '${item.settingKey}'?`)) return;
    try {
      const res = await api.delete(`/config-settings/${item.id}`);
      if (res.data?.success) {
        setSuccessMsg(`Setting '${item.settingKey}' deleted successfully.`);
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchSettings();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete setting.');
    }
  };

  const categories = [
    { code: 'ALL', label: 'All', icon: Sliders },
    { code: 'FIREBASE', label: 'Firebase Push', icon: Bell },
    { code: 'SMTP', label: 'SMTP Email', icon: Mail },
    { code: 'STORAGE', label: 'Storage', icon: HardDrive },
    { code: 'JWT', label: 'JWT Auth', icon: KeyRound },
    { code: 'SECURITY', label: 'Security', icon: Shield },
    { code: 'WEBHOOKS', label: 'Webhooks', icon: Globe },
    { code: 'SYSTEM', label: 'System', icon: Settings }
  ];

  const filteredSettings = settings.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category.toUpperCase() === selectedCategory;
    const matchesSearch =
      item.settingKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'FIREBASE':
        return 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'SMTP':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'WEBHOOKS':
        return 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800';
      case 'JWT':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'STORAGE':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'SECURITY':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto text-xs">
      {/* Header Banner - High Density */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Config Settings
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSettings}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh Settings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Setting</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.code;
            return (
              <button
                key={cat.code}
                onClick={() => setSelectedCategory(cat.code)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search key or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Settings Table - Dense High Compact */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-xs font-medium">Loading settings...</p>
          </div>
        ) : filteredSettings.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
            <Sliders className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No settings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Setting Key</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Setting Value</th>
                  <th className="px-4 py-2.5">Data Type</th>
                  <th className="px-4 py-2.5">Scope</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredSettings.map((item) => {
                  const isValueShown = showValuesMap[item.id];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                          {item.settingKey}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{item.description}</div>
                        )}
                      </td>

                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getCategoryBadgeColor(
                            item.category
                          )}`}
                        >
                          {item.category}
                        </span>
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono text-blue-600 dark:text-blue-400 border border-slate-200/80 dark:border-slate-700/80 max-w-md truncate">
                            {item.isEncrypted && !isValueShown ? '••••••••••••••••' : item.settingValue || '(empty)'}
                          </code>
                          {item.isEncrypted && (
                            <button
                              onClick={() => toggleShowValue(item.id)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                              title={isValueShown ? 'Hide Secret' : 'Show Secret'}
                            >
                              {isValueShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-2.5">
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {item.dataType}
                        </span>
                      </td>

                      <td className="px-4 py-2.5">
                        {item.tenantId !== null ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                            <Building2 className="w-3 h-3" /> Tenant Override
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">
                            <Globe className="w-3 h-3" /> Global Platform
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-2.5 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded text-[11px] font-semibold inline-flex items-center gap-1 transition-colors border border-amber-200 dark:border-amber-800"
                          title="Edit Setting Value"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSetting(item)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Delete Setting"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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

      {/* Edit / Create Setting Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>{editingSetting ? `Edit Setting: ${editingSetting.settingKey}` : 'Create New Setting'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSetting} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Setting Key *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingSetting}
                  placeholder="Enter Setting Key"
                  value={settingKey}
                  onChange={(e) => setSettingKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Setting Value *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter Setting Value"
                  value={settingValue}
                  onChange={(e) => setSettingValue(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="FIREBASE">FIREBASE</option>
                    <option value="SMTP">SMTP</option>
                    <option value="STORAGE">STORAGE</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="JWT">JWT</option>
                    <option value="WEBHOOKS">WEBHOOKS</option>
                    <option value="SYSTEM">SYSTEM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Data Type
                  </label>
                  <select
                    value={dataType}
                    onChange={(e) => setDataType(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="String">String</option>
                    <option value="Number">Number</option>
                    <option value="Boolean">Boolean</option>
                    <option value="Json">Json</option>
                    <option value="Encrypted">Encrypted</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Brief remarks or notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-sm"
                >
                  {editingSetting ? 'Update Setting' : 'Create Setting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigSettingsView;
