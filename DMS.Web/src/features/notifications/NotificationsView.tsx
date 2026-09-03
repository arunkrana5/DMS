import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  Bell,
  Trash2,
  Search,
  FileText,
  HardDrive,
  Globe,
  CheckCheck,
  ShieldCheck,
  Eye,
  Sparkles,
  CheckCircle2,
  Clock,
  Database,
  Smartphone,
  X
} from 'lucide-react';
import { Pagination } from '../../components/common/Pagination';

export const formatNotificationTime = (dateStr: string) => {
  if (!dateStr) return '';
  const utcStr = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
  const date = new Date(utcStr);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  if (diffMins < 1) return `Just now (${timeString})`;
  if (diffMins < 60) return `${diffMins}m ago (${timeString})`;
  if (diffHours < 24) return `${diffHours}h ago (${timeString})`;
  if (diffDays === 1) return `Yesterday (${timeString})`;
  return `${date.toLocaleDateString()} ${timeString}`;
};

export const NotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'UNREAD' | 'SYSTEM' | 'FCM_PUSH' | 'WEBHOOK'>('ALL');
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  // Document Preview Modal State
  const [previewDocPublicId, setPreviewDocPublicId] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const fetchNotifications = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const res = await api.get(`/notifications?pageIndex=${pageIndex}&pageSize=${pageSize}`);
      if (res.data?.success) {
        const items = res.data.data.items || [];
        setNotifications(items);
        setTotalCount(res.data.data.totalCount || 0);
        setTotalPages(res.data.data.totalPages || 1);
        setUnreadCount(res.data.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);

    // 🔄 Real-Time 3-Second Auto-Refresh Polling
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 3000);

    // ⚡ Instant Local Event Listener for Uploads
    const handleUploadEvent = () => fetchNotifications(false);
    window.addEventListener('dms:document-uploaded', handleUploadEvent);

    // 🌐 Cross-Tab / Cross-Window Synchronization Listener
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'dms_upload_timestamp') {
        fetchNotifications(false);
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('dms:document-uploaded', handleUploadEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [pageIndex, pageSize]);

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('dms:document-uploaded'));
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('dms:document-uploaded'));
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('dms:document-uploaded'));
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const getPreviewUrl = (publicId: string) => {
    const token = localStorage.getItem('dms_token');
    return `http://localhost:5000/api/v1/documents/${publicId}/preview?token=${token}`;
  };

  const isImageFile = (name: string) => {
    if (!name) return true;
    const ext = name.toLowerCase();
    return ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.gif') || ext.endsWith('.webp') || ext.endsWith('.svg') || name === 'Document Preview';
  };

  const handleOpenDocPreview = (n: any) => {
    let docGuid = null;
    let fileName = n.title || 'Document Preview';
    if (n.dataJson) {
      try {
        const parsed = typeof n.dataJson === 'string' ? JSON.parse(n.dataJson) : n.dataJson;
        docGuid = parsed.DocumentPublicId || parsed.documentPublicId || parsed.PublicId || parsed.publicId;
        if (parsed.FileName || parsed.fileName) fileName = parsed.FileName || parsed.fileName;
      } catch (e) {
        console.error(e);
      }
    }

    if (!docGuid && n.message) {
      const match = n.message.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
      if (match) docGuid = match[0];
    }

    if (docGuid) {
      setPreviewDocPublicId(docGuid);
      setPreviewTitle(fileName);
    }
  };

  const filteredItems = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'UNREAD') return !n.isRead;
    if (filterType === 'SYSTEM') return n.notificationType === 'SYSTEM';
    if (filterType === 'FCM_PUSH') return n.notificationType === 'FCM_PUSH';
    if (filterType === 'WEBHOOK') return n.notificationType === 'WEBHOOK';
    return true;
  });

  const systemCount = notifications.filter((n) => n.notificationType === 'SYSTEM').length;
  const pushCount = notifications.filter((n) => n.notificationType === 'FCM_PUSH').length;

  return (
    <div className="p-4 space-y-4">
      {/* 🚀 Hero Analytics Metric Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl shadow-lg border border-blue-500/30 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Total Alerts Logged</div>
            <div className="text-2xl font-black mt-0.5">{totalCount}</div>
            <div className="text-[10px] text-blue-200 mt-1 flex items-center gap-1 font-medium">
              <Database className="w-3 h-3 text-blue-300" />
              <span>SQL Database Synced</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Bell className="w-5 h-5 text-white" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unread Notifications</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{unreadCount}</div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1 flex items-center gap-1">
              {unreadCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>}
              <span>Requires Attention</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Audit Alerts</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{systemCount}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Real-Time Upload Audits</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-900">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">FCM Push Messages</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{pushCount}</div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1 flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              <span>Firebase Cloud Messaging</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-900">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs, Search & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold overflow-x-auto w-full sm:w-auto border border-slate-200 dark:border-slate-800">
          {(['ALL', 'UNREAD', 'SYSTEM', 'FCM_PUSH', 'WEBHOOK'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3.5 py-1.5 rounded-lg transition-all capitalize whitespace-nowrap text-xs ${
                filterType === tab
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab === 'ALL' ? 'All Notifications' : tab === 'UNREAD' ? `Unread (${unreadCount})` : tab === 'FCM_PUSH' ? 'FCM Push' : tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search titles, files, or messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 outline-none shadow-xs font-medium"
            />
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading notification records from SQL Server...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Bell className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No notifications found matching filter.</div>
            <p className="text-xs text-slate-400">Try switching tabs or searching for another keyword.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredItems.map((n) => {
              const isUnread = !n.isRead;
              let hasDocGuid = false;
              if (n.dataJson) {
                try {
                  const p = JSON.parse(n.dataJson);
                  if (p.DocumentPublicId || p.documentPublicId || p.PublicId) hasDocGuid = true;
                } catch (e) {}
              }

              return (
                <div
                  key={n.id}
                  onClick={() => isUnread && markAsRead(n.id)}
                  className={`p-4 transition-all flex flex-col space-y-2 cursor-pointer ${
                    isUnread
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 border-l-4 border-l-blue-600 hover:bg-blue-50/70'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Avatar Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold shadow-xs border ${
                          n.notificationType === 'FCM_PUSH'
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 border-purple-200 dark:border-purple-900'
                            : n.notificationType === 'WEBHOOK'
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border-indigo-200 dark:border-indigo-900'
                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 border-blue-200 dark:border-blue-900'
                        }`}
                      >
                        {n.notificationType === 'FCM_PUSH' ? (
                          <Smartphone className="w-4 h-4" />
                        ) : n.notificationType === 'WEBHOOK' ? (
                          <Globe className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isUnread && <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>}
                          <h4 className={`text-xs ${isUnread ? 'font-black text-slate-900 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                            {n.title}
                          </h4>

                          {/* Type Pill */}
                          <span
                            className={`px-2 py-0.3 font-mono text-[9px] font-bold rounded-full border ${
                              n.notificationType === 'FCM_PUSH'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : n.notificationType === 'WEBHOOK'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {n.notificationType}
                          </span>

                          {/* Priority Pill */}
                          <span className="px-2 py-0.3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[9px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                            HIGH SEVERITY
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                          {n.message}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1 font-bold text-slate-500 dark:text-slate-400">
                            <Clock className="w-3 h-3 text-blue-500" />
                            {formatNotificationTime(n.createdDate)}
                          </span>
                          <span>•</span>
                          <span>SQL ID: #{n.id}</span>
                          <span>•</span>
                          <span className="truncate max-w-xs font-mono text-slate-400">Public: {n.publicId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasDocGuid && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDocPreview(n);
                          }}
                          className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Doc</span>
                        </button>
                      )}

                      {isUnread && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Mark Read</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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

      {/* 👁️ Embedded Document Preview Modal */}
      {previewDocPublicId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="modal-animate bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-xs truncate">{previewTitle}</h3>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    Document GUID: {previewDocPublicId}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewDocPublicId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-auto flex items-center justify-center bg-slate-950/40 min-h-[65vh]">
              {isImageFile(previewTitle) ? (
                <img
                  src={getPreviewUrl(previewDocPublicId)}
                  alt={previewTitle}
                  className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-2xl border border-slate-800"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <iframe
                  src={getPreviewUrl(previewDocPublicId)}
                  title={previewTitle}
                  className="w-full h-[72vh] rounded-xl border-0 shadow-xl bg-white dark:bg-slate-900"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
