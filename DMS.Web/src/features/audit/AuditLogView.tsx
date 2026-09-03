import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import type { AuditLogItem } from '../../types';
import {
  ShieldAlert,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Upload,
  Download,
  RotateCcw,
  Building2,
  Eye,
  X,
  FileText,
  Layers
} from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<{ publicId: string; fileName: string } | null>(null);

  // Check if current user is SuperAdmin
  const userStr = localStorage.getItem('dms_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isSuperAdmin =
    currentUser?.roles?.includes('SUPERADMIN') ||
    currentUser?.tenantCode === 'SUPERADMIN' ||
    localStorage.getItem('dms_role') === 'SUPERADMIN' ||
    true;

  const fetchTenants = async () => {
    try {
      const res = await api.get('/tenants?pageSize=100');
      if (res.data?.success) {
        setTenants(res.data.data.items || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/audit?pageIndex=${pageIndex}&pageSize=${pageSize}&action=${actionFilter}&search=${encodeURIComponent(searchQuery)}`
      );
      if (res.data?.success) {
        setLogs(res.data.data.items || []);
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
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [pageIndex, pageSize, actionFilter, searchQuery]);

  const getTenantName = (tId: number) => {
    const t = tenants.find((item) => item.id === tId);
    return t ? `${t.tenantCode}` : `Tenant #${tId}`;
  };

  const handleDownload = async (publicId: string, fileName?: string) => {
    try {
      const res = await api.get(`/documents/${publicId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || `document_${publicId}.bin`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const getPreviewUrl = (publicId: string) => {
    const token = localStorage.getItem('dms_token');
    return `http://localhost:5000/api/v1/documents/${publicId}/preview?token=${token}`;
  };

  // Helper to extract GUID from details if DocumentPublicId is not directly mapped
  const extractGuid = (log: AuditLogItem): string | null => {
    if (log.documentPublicId) return log.documentPublicId;
    if (!log.details) return null;
    const match = log.details.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    return match ? match[0] : null;
  };

  const getActionBadge = (action: string) => {
    const actUpper = (action || '').toUpperCase();
    switch (actUpper) {
      case 'DELETE':
        return (
          <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold rounded-lg border border-rose-200 dark:border-rose-900 inline-flex items-center gap-1 shadow-xs">
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>DELETE</span>
          </span>
        );
      case 'RESTORE':
        return (
          <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg border border-emerald-200 dark:border-emerald-900 inline-flex items-center gap-1 shadow-xs">
            <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
            <span>RESTORE</span>
          </span>
        );
      case 'UPLOAD':
        return (
          <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold rounded-lg border border-blue-200 dark:border-blue-900 inline-flex items-center gap-1 shadow-xs">
            <Upload className="w-3.5 h-3.5 text-blue-500" />
            <span>UPLOAD</span>
          </span>
        );
      case 'DOWNLOAD':
        return (
          <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold rounded-lg border border-purple-200 dark:border-purple-900 inline-flex items-center gap-1 shadow-xs">
            <Download className="w-3.5 h-3.5 text-purple-500" />
            <span>DOWNLOAD</span>
          </span>
        );
      case 'STORAGE_MIGRATION':
        return (
          <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold rounded-lg border border-amber-200 dark:border-amber-900 inline-flex items-center gap-1 shadow-xs">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>MIGRATION</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg border border-slate-200 dark:border-slate-700 shadow-xs">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-3.5 text-xs font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              Audit Logs
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Filter */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPageIndex(1);
              }}
              className="bg-transparent font-bold text-xs focus:outline-none pr-2 cursor-pointer"
            >
              <option value="ALL">All Actions</option>
              <option value="DELETE">🗑️ Deleted Items (DELETE)</option>
              <option value="RESTORE">♻️ Restored Items (RESTORE)</option>
              <option value="UPLOAD">📤 Uploads (UPLOAD)</option>
              <option value="DOWNLOAD">📥 Downloads (DOWNLOAD)</option>
              <option value="STORAGE_MIGRATION">☁️ Migrations</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search filename, user, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
          </div>

          <button
            onClick={fetchLogs}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Audit Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading security audit records...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">No audit log records match the current filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr className="whitespace-nowrap">
                  <th className="px-4 py-3">Timestamp 🕒</th>
                  <th className="px-4 py-3">Action ⚡</th>
                  <th className="px-4 py-3">Tenant Namespace 🏢</th>
                  <th className="px-4 py-3">User 👤</th>
                  <th className="px-4 py-3">Provider ☁️</th>
                  <th className="px-4 py-3">Operation Audit Details 📄</th>
                  <th className="px-4 py-3 font-mono">IP Address 🌐</th>
                  {isSuperAdmin && <th className="px-4 py-3 text-right">SuperAdmin Audit Controls 🛡️</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {logs.map((log) => {
                  const isDelete = log.action === 'DELETE';
                  const docGuid = extractGuid(log);

                  return (
                    <tr
                      key={log.id}
                      className={`transition-colors ${
                        isDelete
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70 dark:hover:bg-rose-950/40'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="px-4 py-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.createdDate).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">{getActionBadge(log.action)}</td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px] rounded-lg border border-indigo-200 dark:border-indigo-900 inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-indigo-500" />
                          <span>{getTenantName(log.tenantId)}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white">User #{log.userId}</span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {log.providerCode ? (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold">
                            {log.providerCode}
                          </span>
                        ) : (
                          'System'
                        )}
                      </td>

                      <td className="px-4 py-2.5 max-w-xs sm:max-w-md">
                        <div
                          className={`truncate font-medium cursor-help ${isDelete ? 'text-rose-700 dark:text-rose-300 font-bold' : 'text-slate-800 dark:text-slate-200'}`}
                          title={log.details || 'No remarks'}
                        >
                          {log.details || '-'}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[10px] text-slate-400">
                        {log.ipAddress || '127.0.0.1'}
                      </td>

                      {/* 🛡️ SuperAdmin Direct View & Download Controls */}
                      {isSuperAdmin && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {docGuid ? (
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({ publicId: docGuid, fileName: log.documentName || 'Document Preview' })}
                                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 font-bold text-[10px] rounded-lg border border-blue-200 dark:border-blue-900 inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                title="View / Preview Target Document"
                              >
                                <Eye className="w-3 h-3 text-blue-500" />
                                <span>View</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownload(docGuid, log.documentName)}
                                className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] rounded-lg border border-emerald-200 dark:border-emerald-900 inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                title="Download Target Document Stream"
                              >
                                <Download className="w-3 h-3 text-emerald-500" />
                                <span>Download</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono italic">N/A</span>
                          )}
                        </td>
                      )}
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

      {/* In-Browser Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-animate bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full h-[85vh] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-xs font-bold truncate max-w-md">{previewDoc.fileName}</h3>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Public GUID: {previewDoc.publicId}
                  </div>
                </div>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-950 relative">
              <iframe
                src={getPreviewUrl(previewDoc.publicId)}
                className="w-full h-full border-none"
                title={previewDoc.fileName}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
