import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';
import APP_CONFIG, { type AppConfig } from '../config/app.config';

interface ThemeContextType {
  config: AppConfig;
  primaryColorHex: string;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  config: APP_CONFIG,
  primaryColorHex: '#2563eb',
  refreshTheme: async () => {}
});

function getGradientForHex(hexInput: string): string {
  if (!hexInput) return 'from-blue-600 to-indigo-600';
  const hex = hexInput.trim().toLowerCase();

  // Explicit color name or known hex matches
  if (hex.includes('pink') || hex.includes('rose') || hex.includes('magenta') || hex.includes('fuchsia') || hex.includes('93387a') || hex.includes('ec4899') || hex.includes('db2777') || hex.includes('d946ef') || hex.includes('c026d3')) {
    return 'from-fuchsia-600 to-pink-600';
  }
  if (hex.includes('red') || hex.includes('dc2626') || hex.includes('ef4444') || hex.includes('b91c1c')) {
    return 'from-red-600 to-rose-600';
  }
  if (hex.includes('green') || hex.includes('emerald') || hex.includes('059669') || hex.includes('10b981')) {
    return 'from-emerald-600 to-teal-600';
  }
  if (hex.includes('teal') || hex.includes('cyan') || hex.includes('06b6d4') || hex.includes('0d9488')) {
    return 'from-cyan-600 to-teal-600';
  }
  if (hex.includes('purple') || hex.includes('violet') || hex.includes('7c3aed') || hex.includes('8b5cf6')) {
    return 'from-violet-600 to-purple-600';
  }
  if (hex.includes('amber') || hex.includes('orange') || hex.includes('d97706') || hex.includes('f59e0b')) {
    return 'from-amber-600 to-orange-600';
  }
  if (hex.includes('indigo') || hex.includes('4f46e5') || hex.includes('6366f1')) {
    return 'from-indigo-600 to-purple-600';
  }

  // Parse custom #rrggbb
  if (hex.startsWith('#')) {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);

      // Pink / Magenta / Fuchsia: R and B are high, G is low (e.g. #93387a: R=147, G=56, B=122)
      if (r > g + 25 && b > g + 25 && Math.abs(r - b) < 70) return 'from-fuchsia-600 to-pink-600';
      // Red: R is significantly higher than G and B
      if (r > g + 30 && r > b + 30) return 'from-red-600 to-rose-600';
      // Violet / Purple: B is significantly higher than R and G
      if (b > r + 30 && b > g + 30) return 'from-violet-600 to-purple-600';
      // Emerald: G is significantly higher than R and B
      if (g > r + 30 && g > b + 30) return 'from-emerald-600 to-teal-600';
      // Amber: R is high, G is medium, B is low
      if (r > b + 30 && g > b + 20) return 'from-amber-600 to-orange-600';
      // Cyan / Teal: G and B are high, R is low
      if (g > r + 25 && b > r + 25) return 'from-cyan-600 to-teal-600';
      // Blue: B is significantly higher than R and G
      if (b > r + 20 && b > g + 20) return 'from-blue-600 to-indigo-600';
    }
  }

  return 'from-blue-600 to-indigo-600';
}

function getThemeStylesForColor(hexInput: string) {
  const gradient = getGradientForHex(hexInput);

  if (gradient.includes('fuchsia') || gradient.includes('pink')) {
    return {
      brandGradient: 'from-fuchsia-600 to-pink-600',
      activeNavBg: 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 border border-pink-200/60 dark:border-pink-900/60 shadow-xs font-bold',
      primaryButtonBg: 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold shadow-md cursor-pointer',
      badgeBg: 'bg-pink-50 text-pink-600 dark:bg-pink-950/60 dark:text-pink-400 font-mono font-bold border border-pink-200 dark:border-pink-800',
      textHighlight: 'text-pink-600 dark:text-pink-400',
      tableHeaderBg: 'bg-pink-50/80 dark:bg-pink-950/60 text-pink-900 dark:text-pink-200 border-b border-pink-200/80 dark:border-pink-900/60',
      tableHeaderCell: 'text-pink-700 dark:text-pink-300 font-black uppercase tracking-wider',
      cardHeaderBanner: 'bg-gradient-to-r from-fuchsia-900/40 via-pink-900/30 to-slate-900/20 border-b border-pink-200/40 dark:border-pink-900/40'
    };
  }
  if (gradient.includes('red')) {
    return {
      brandGradient: 'from-red-600 to-rose-600',
      activeNavBg: 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/60 shadow-xs font-bold',
      primaryButtonBg: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold shadow-md cursor-pointer',
      badgeBg: 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 font-mono font-bold border border-red-200 dark:border-red-800',
      textHighlight: 'text-red-600 dark:text-red-400',
      tableHeaderBg: 'bg-red-50/80 dark:bg-red-950/60 text-red-900 dark:text-red-200 border-b border-red-200/80 dark:border-red-900/60',
      tableHeaderCell: 'text-red-700 dark:text-red-300 font-black uppercase tracking-wider',
      cardHeaderBanner: 'bg-gradient-to-r from-red-900/40 via-rose-900/30 to-slate-900/20 border-b border-red-200/40 dark:border-red-900/40'
    };
  }
  if (gradient.includes('emerald') || gradient.includes('cyan')) {
    return {
      brandGradient: 'from-emerald-600 to-teal-600',
      activeNavBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60 shadow-xs font-bold',
      primaryButtonBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md cursor-pointer',
      badgeBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-mono font-bold border border-emerald-200 dark:border-emerald-800',
      textHighlight: 'text-emerald-600 dark:text-emerald-400',
      tableHeaderBg: 'bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-b border-emerald-200/80 dark:border-emerald-900/60',
      tableHeaderCell: 'text-emerald-700 dark:text-emerald-300 font-black uppercase tracking-wider',
      cardHeaderBanner: 'bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-slate-900/20 border-b border-emerald-200/40 dark:border-emerald-900/40'
    };
  }
  if (gradient.includes('violet')) {
    return {
      brandGradient: 'from-violet-600 to-purple-600',
      activeNavBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/60 shadow-xs font-bold',
      primaryButtonBg: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold shadow-md cursor-pointer',
      badgeBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 font-mono font-bold border border-purple-200 dark:border-purple-800',
      textHighlight: 'text-purple-600 dark:text-purple-400',
      tableHeaderBg: 'bg-purple-50/80 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-b border-purple-200/80 dark:border-purple-900/60',
      tableHeaderCell: 'text-purple-700 dark:text-purple-300 font-black uppercase tracking-wider',
      cardHeaderBanner: 'bg-gradient-to-r from-violet-900/40 via-purple-900/30 to-slate-900/20 border-b border-purple-200/40 dark:border-purple-900/40'
    };
  }
  if (gradient.includes('amber')) {
    return {
      brandGradient: 'from-amber-600 to-orange-600',
      activeNavBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60 shadow-xs font-bold',
      primaryButtonBg: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold shadow-md cursor-pointer',
      badgeBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-mono font-bold border border-amber-200 dark:border-amber-800',
      textHighlight: 'text-amber-600 dark:text-amber-400',
      tableHeaderBg: 'bg-amber-50/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-b border-amber-200/80 dark:border-amber-900/60',
      tableHeaderCell: 'text-amber-700 dark:text-amber-300 font-black uppercase tracking-wider',
      cardHeaderBanner: 'bg-gradient-to-r from-amber-900/40 via-orange-900/30 to-slate-900/20 border-b border-amber-200/40 dark:border-amber-900/40'
    };
  }

  // Default Blue
  return {
    brandGradient: 'from-blue-600 to-indigo-600',
    activeNavBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 shadow-xs font-bold',
    primaryButtonBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-md cursor-pointer',
    badgeBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-mono font-bold border border-blue-200 dark:border-blue-800',
    textHighlight: 'text-blue-600 dark:text-blue-400',
    tableHeaderBg: 'bg-blue-50/80 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border-b border-blue-200/80 dark:border-blue-900/60',
    tableHeaderCell: 'text-blue-700 dark:text-blue-300 font-black uppercase tracking-wider',
    cardHeaderBanner: 'bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/20 border-b border-blue-200/40 dark:border-blue-900/40'
  };
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(APP_CONFIG);
  const [primaryColorHex, setPrimaryColorHex] = useState<string>('#2563eb');

  const fetchThemeSettings = async () => {
    try {
      let activeTenantCode = localStorage.getItem('dms_tenant') || '';
      if (!activeTenantCode) {
        try {
          const storedUserStr = localStorage.getItem('dms_user');
          if (storedUserStr) {
            const storedUser = JSON.parse(storedUserStr);
            if (storedUser?.tenantCode) {
              activeTenantCode = storedUser.tenantCode;
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      const token = localStorage.getItem('dms_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_BASE_URL}/config-settings/public-theme?tenantCode=${encodeURIComponent(activeTenantCode)}`, { headers });
      if (res.data?.success && res.data.data) {
        const dbTheme: Record<string, string> = res.data.data;
        const tenantPrimaryHex = dbTheme['Theme.PrimaryColorHex'] || '#2563eb';
        setPrimaryColorHex(tenantPrimaryHex);

        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--tenant-primary', tenantPrimaryHex);
        }

        const dynamicStyles = getThemeStylesForColor(tenantPrimaryHex);

        setConfig((prev) => ({
          ...prev,
          appName: dbTheme['Theme.AppName'] || prev.appName,
          appNameHighlight: dbTheme['Theme.AppNameHighlight'] || prev.appNameHighlight,
          appSubtitle: dbTheme['Tenant.Name'] ? ` ${dbTheme['Tenant.Name']}` : (dbTheme['Theme.AppSubtitle'] || prev.appSubtitle),
          companyName: dbTheme['Company.Name'] || dbTheme['Theme.CompanyName'] || prev.companyName,
          supportEmail: dbTheme['Theme.SupportEmail'] || prev.supportEmail,
          copyrightText: dbTheme['Theme.CopyrightText'] || prev.copyrightText,
          theme: {
            ...prev.theme,
            brandGradient: dynamicStyles.brandGradient,
            activeNavBg: dynamicStyles.activeNavBg,
            primaryButtonBg: dynamicStyles.primaryButtonBg,
            badgeBg: dynamicStyles.badgeBg,
            textHighlight: dynamicStyles.textHighlight,
            tableHeaderBg: dynamicStyles.tableHeaderBg,
            tableHeaderCell: dynamicStyles.tableHeaderCell,
            cardHeaderBanner: dynamicStyles.cardHeaderBanner,
            primaryColorName: dbTheme['Theme.PrimaryColorName'] || prev.theme.primaryColorName
          }
        }));
      }
    } catch (err) {
      console.warn('Using static theme configuration fallback');
    }
  };

  useEffect(() => {
    fetchThemeSettings();

    const handleThemeUpdate = () => {
      fetchThemeSettings();
    };

    window.addEventListener('dms:theme-updated', handleThemeUpdate);
    return () => window.removeEventListener('dms:theme-updated', handleThemeUpdate);
  }, []);

  return (
    <ThemeContext.Provider value={{ config, primaryColorHex, refreshTheme: fetchThemeSettings }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
