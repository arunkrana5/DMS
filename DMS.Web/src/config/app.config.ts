export interface AppConfig {
  // Brand & Identity
  appName: string;
  appNameHighlight: string;
  appSubtitle: string;
  appTitleTag: string;
  logoBadgeText: string;

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
    primaryColorName: "blue",
    brandGradient: "from-blue-600 via-indigo-600 to-slate-900",
    sidebarBg: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80",
    navbarBg: "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-800/80",
    cardBg: "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs rounded-2xl",
    activeNavBg: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 shadow-xs font-bold",
    primaryButtonBg: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-md cursor-pointer",
    badgeBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-mono font-bold",
    textHighlight: "text-blue-600 dark:text-blue-400",
    tableHeaderBg: "bg-blue-50/70 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 border-b border-blue-200/60 dark:border-blue-900/60",
    tableHeaderCell: "text-blue-700 dark:text-blue-300 font-extrabold uppercase tracking-wider",
    cardHeaderBanner: "bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/20 border-b border-blue-200/40 dark:border-blue-900/40"
  },

  // ⚙️ Enterprise Defaults
  defaultPageSize: 10,
  companyName: "Arun Rana Enterprise",
  supportEmail: "support@dms-azie.onrender.com",
  version: "v2.5.0-Enterprise",
  copyrightText: "© 2026 Arun Rana. All rights reserved."
};

export default APP_CONFIG;
