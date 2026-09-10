export interface AppConfig {
  // Brand & Identity
  appName: string;
  appNameHighlight: string;
  appSubtitle: string;
  appTitleTag: string;
  logoBadgeText: string;
  logoUrl?: string;

  // Theme & Styling Customization (Single Place to Edit)
  theme: {
    primaryColorName: string;
    brandGradient: string;
    sidebarBg: string;
    navbarBg: string;
    cardBg: string;
    activeNavBg: string;
    primaryButtonBg: string;
    badgeBg: string;
    textHighlight: string;
    tableHeaderBg: string;
    tableHeaderCell: string;
    cardHeaderBanner: string;
  };

  // Enterprise Defaults & Info
  defaultPageSize: number;
  companyName: string;
  supportEmail: string;
  version: string;
  copyrightText: string;
}

export const APP_CONFIG: AppConfig = {
  // 🏢 Brand & Identity
  appName: "Enterprise DMS",
  appNameHighlight: "DMS",
  appSubtitle: "Managed By Arun Rana",
  appTitleTag: "Document Management System",
  logoBadgeText: "DMS",

  // 🎨 Theme & Styling Customization (Change theme & brand in ONE place here)
  theme: {
    primaryColorName: "dynamic",
    brandGradient: "bg-tenant-gradient",
    sidebarBg: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80",
    navbarBg: "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-800/80",
    cardBg: "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs rounded-2xl",
    activeNavBg: "active-nav-tenant",
    primaryButtonBg: "btn-tenant-primary",
    badgeBg: "badge-tenant-primary",
    textHighlight: "text-tenant-primary",
    tableHeaderBg: "table-header-tenant",
    tableHeaderCell: "table-header-cell-tenant",
    cardHeaderBanner: "card-header-banner-tenant"
  },

  // ⚙️ Enterprise Defaults
  defaultPageSize: 10,
  companyName: "Arun Rana Enterprise",
  supportEmail: "support@dms-azie.onrender.com",
  version: "v2.5.0-Enterprise",
  copyrightText: "© 2026 Arun Rana. All rights reserved."
};

export default APP_CONFIG;
