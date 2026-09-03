import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderTree,
  HardDrive,
  AppWindow,
  FileSpreadsheet,
  History,
  ShieldCheck,
  Globe,
  Sliders,
  Layers,
  ChevronLeft,
  ChevronRight,
  Building2,
  BookOpen,
  Bell
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('dms_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('dms_sidebar_collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const userStr = localStorage.getItem('dms_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isSuperAdmin =
    user?.roles?.includes('SUPERADMIN') ||
    user?.tenantCode === 'SUPERADMIN' ||
    localStorage.getItem('dms_role') === 'SUPERADMIN';
  const userPermissions: string[] = user?.permissions || [];

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Tenants & Users', path: '/tenants', icon: Building2, requiredPermission: 'MANAGE_TENANTS' },
    { label: 'Roles & Permissions', path: '/roles', icon: ShieldCheck, requiredPermission: 'MANAGE_ROLES' },
    { label: 'API Manual', path: '/api-manual', icon: BookOpen },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Document Explorer', path: '/documents', icon: FolderTree, requiredPermission: 'DOCUMENT_VIEW' },
    { label: 'Storage Profiles', path: '/storage', icon: HardDrive, requiredPermission: 'MANAGE_STORAGE_PROFILES' },
    { label: 'Applications', path: '/applications', icon: AppWindow, requiredPermission: 'MANAGE_APPLICATIONS' },
    { label: 'Module Master', path: '/modules', icon: Layers },
    { label: 'Document Types', path: '/document-types', icon: FileSpreadsheet, requiredPermission: 'MANAGE_DOCUMENT_TYPES' },
    { label: 'Config Settings', path: '/config-settings', icon: Sliders, requiredPermission: 'MANAGE_CONFIG' },
    { label: 'Audit Logs', path: '/audit', icon: History, requiredPermission: 'VIEW_AUDIT_LOGS' },
    { label: 'Webhooks', path: '/webhooks', icon: Globe, requiredPermission: 'MANAGE_CONFIG' },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (isSuperAdmin) return true;
    if (!item.requiredPermission) return true;
    return userPermissions.includes(item.requiredPermission);
  });

  return (
    <aside
      className={`border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex flex-col justify-between h-screen sticky top-0 transition-all duration-300 z-30 ${
        isCollapsed ? 'w-14' : 'w-56'
      }`}
    >
      <div>
        {/* Exact h-12 Header matching Navbar */}
        {isCollapsed ? (
          <div className="h-12 px-2 flex items-center justify-center border-b border-slate-200 dark:border-slate-800/80">
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-xs hover:scale-105 active:scale-95 transition-all group relative"
              title="Click to Expand Sidebar"
            >
              <Layers className="w-3.5 h-3.5 group-hover:hidden" />
              <ChevronRight className="w-3.5 h-3.5 hidden group-hover:block text-white" />
            </button>
          </div>
        ) : (
          <div className="h-12 px-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-xs shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div className="transition-opacity duration-200 min-w-0">
                <div className="font-extrabold text-slate-900 dark:text-white tracking-tight leading-none text-xs truncate">
                  <span className="text-blue-600">DMS</span>
                </div>
                <div className="text-[8px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase mt-0.5">Managed By Arun Rana</div>
              </div>
            </div>

            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-2 space-y-1">
          {!isCollapsed && (
            <div className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 mt-0.5">
              Menu
            </div>
          )}
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isCollapsed ? 'justify-center py-2' : ''
                  } ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className={`p-2.5 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-400 ${isCollapsed ? 'flex justify-center p-2' : ''}`}>
        {isCollapsed ? (
          <div title="Tenant Isolated & Encrypted">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400 text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Tenant Isolated</span>
            </div>
            <div className="mt-0.5 text-[8px] font-mono text-slate-400">v1.0.0 ASP.NET Core 10</div>
          </div>
        )}
      </div>
    </aside>
  );
};
