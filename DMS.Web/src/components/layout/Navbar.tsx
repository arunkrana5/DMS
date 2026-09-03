import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, Sun, Moon, Building2, LogOut, CheckCircle2, HardDrive, FileText, X, ChevronDown, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatNotificationTime } from '../../features/notifications/NotificationsView';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'storage' | 'document' | 'system';
  unread: boolean;
}

interface TenantOption {
  tenantCode: string;
  tenantName: string;
}

export const Navbar: React.FC<NavbarProps> = ({ darkMode, setDarkMode, searchTerm, setSearchTerm }) => {
  const { user, tenantName, tenantCode, switchTenant, logout } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [tenantList, setTenantList] = useState<TenantOption[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const seenNotifIdsRef = React.useRef<Set<string>>(new Set());
  const isInitializedRef = React.useRef(false);

  const requestDesktopPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setDesktopPermission(perm);
      if (perm === 'granted') {
        try {
          new Notification('🔔 Antigravity DMS Platform', {
            body: 'Windows Desktop OS Notifications are now active!',
            icon: '/favicon.ico'
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const fetchLiveNotifications = async () => {
    try {
      const res = await api.get('/notifications?pageSize=15');
      if (res.data?.success) {
        const items = res.data.data.items || [];
        setUnreadCount(res.data.data.unreadCount || 0);

        if (!isInitializedRef.current) {
          // On first load, seed seen IDs so past notifications don't spam popups
          items.forEach((n: any) => seenNotifIdsRef.current.add(n.id.toString()));
          isInitializedRef.current = true;
        } else {
          // For subsequent live updates, trigger desktop popup for any brand new unread notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            items.forEach((n: any) => {
              const notifId = n.id.toString();
              if (!n.isRead && !seenNotifIdsRef.current.has(notifId)) {
                seenNotifIdsRef.current.add(notifId);
                try {
                  new Notification(n.title, {
                    body: n.message,
                    icon: '/favicon.ico',
                    tag: notifId
                  });
                } catch (e) {
                  console.error('Desktop Notification error', e);
                }
              }
            });
          }
        }

        setNotifications(
          items.map((n: any) => ({
            id: n.id.toString(),
            title: n.title,
            desc: n.message,
            time: formatNotificationTime(n.createdDate),
            type: n.notificationType === 'FCM_PUSH' ? 'document' : n.notificationType === 'WEBHOOK' ? 'storage' : 'system',
            unread: !n.isRead
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch live notifications', err);
    }
  };

  const fetchTenantsForSuperAdmin = async () => {
    try {
      const res = await api.get('/tenants?pageSize=100');
      if (res.data.success) {
        const items = res.data.data.items || [];
        setTenantList(items.map((t: any) => ({ tenantCode: t.tenantCode, tenantName: t.tenantName })));
      }
    } catch (err) {
      console.error('Failed to fetch tenants for selector', err);
    }
  };

  useEffect(() => {
    const superAdminRole = tenantCode === 'SUPERADMIN' || user?.roles?.includes('SUPERADMIN') || user?.roles?.includes('SuperAdmin');
    setIsSuperAdmin(!!superAdminRole);

    if (superAdminRole) {
      fetchTenantsForSuperAdmin();
    }
    fetchLiveNotifications();

    // 🔄 Real-Time Event Listener & 10s Auto-Polling
    const handleUploadEvent = () => fetchLiveNotifications();
    window.addEventListener('dms:document-uploaded', handleUploadEvent);
    const interval = setInterval(fetchLiveNotifications, 10000);

    return () => {
      window.removeEventListener('dms:document-uploaded', handleUploadEvent);
      clearInterval(interval);
    };
  }, [tenantCode, user]);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const clearNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      fetchLiveNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTenantSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    const found = tenantList.find((t) => t.tenantCode === selectedCode);
    if (found) {
      switchTenant(found.tenantCode, found.tenantName);
    } else if (selectedCode === 'SUPERADMIN') {
      switchTenant('SUPERADMIN', 'Platform Super Administrator');
    }
  };

  return (
    <header className="h-12 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40 transition-colors">
      {/* Search Input */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents, tags, modules, entity IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-[11px] bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
        {/* Tenant Chip / Switcher */}
        {isSuperAdmin ? (
          <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-[11px] font-medium border border-indigo-200 dark:border-indigo-900/80 px-2 py-0.5 shadow-xs">
            <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <select
              value={tenantCode}
              onChange={handleTenantSelect}
              className="bg-transparent text-indigo-700 dark:text-indigo-300 font-bold text-[11px] focus:outline-none cursor-pointer py-0.5"
              title="SuperAdmin Tenant Switcher"
            >
              <option value="SUPERADMIN" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold">
                👑 SUPERADMIN (System Overview)
              </option>
              {tenantList
                .filter((t) => t.tenantCode !== 'SUPERADMIN')
                .map((t) => (
                  <option key={t.tenantCode} value={t.tenantCode} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium">
                    🏢 {t.tenantCode} — {t.tenantName}
                  </option>
                ))}
            </select>
            <ChevronDown className="w-3 h-3 text-indigo-400 shrink-0 pointer-events-none" />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-medium border border-blue-200/60 dark:border-blue-900/60">
            <Building2 className="w-3 h-3 text-blue-500" />
            <span className="font-semibold truncate max-w-[120px]">{tenantName}</span>
            <span className="bg-blue-200/80 dark:bg-blue-800/80 text-blue-900 dark:text-blue-100 px-1 py-0.2 rounded text-[9px] font-mono">
              {tenantCode}
            </span>
          </div>
        )}

        {/* Theme Switcher Button */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
        </button>

        {/* Notifications Bell & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all relative flex items-center gap-1"
            title="Notifications Center"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-blue-600 text-white font-extrabold text-[9px] shadow-sm animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-88 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-3.5 space-y-2.5 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white">Activity Alerts</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-extrabold text-[9px] rounded-full border border-blue-200 dark:border-blue-900">
                      {unreadCount} Unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {desktopPermission !== 'granted' ? (
                <button
                  onClick={requestDesktopPermission}
                  className="w-full text-center py-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Bell className="w-3 h-3" />
                  <span>Enable Windows OS Desktop Notifications</span>
                </button>
              ) : (
                <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1 py-1 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200/60 dark:border-emerald-900/60 shadow-xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Windows OS Notifications Active</span>
                </div>
              )}

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">No notifications yet.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`py-2.5 px-2 flex items-start justify-between gap-2.5 transition-colors rounded-lg ${
                        n.unread ? 'bg-blue-50/50 dark:bg-blue-950/30 font-semibold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700">
                          {n.type === 'storage' ? (
                            <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                          ) : n.type === 'document' ? (
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>}
                            <div className="font-bold text-slate-900 dark:text-white text-[11px] truncate">{n.title}</div>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate">{n.desc}</div>
                          <div className="text-[9px] font-mono text-slate-400 pt-0.5">🕒 {n.time}</div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(n.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 shrink-0 transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setIsNotifOpen(false)}
                  className="block w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] rounded-lg transition-colors shadow-xs"
                >
                  Open Enterprise Notification Center ➔
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800/80">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
            {user?.username?.[0]?.toUpperCase() || 'S'}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100 leading-tight">{user?.username}</div>
            <div className="text-[9px] font-medium text-slate-400 leading-none">{user?.email}</div>
          </div>
          <button
            onClick={logout}
            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-0.5"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
