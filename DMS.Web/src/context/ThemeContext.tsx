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

function hexToRgb(hexInput: string): { r: number; g: number; b: number } {
  let hex = (hexInput || '#2563eb').trim().replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  if (hex.length !== 6) {
    return { r: 37, g: 99, b: 235 };
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function adjustBrightness(r: number, g: number, b: number, factor: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const nr = clamp(r * factor);
  const ng = clamp(g * factor);
  const nb = clamp(b * factor);
  return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
}

function generateGradientEnd(r: number, g: number, b: number): string {
  const nr = Math.min(255, Math.round(r * 0.85 + 30));
  const ng = Math.min(255, Math.round(g * 0.85 + 20));
  const nb = Math.min(255, Math.round(b * 1.1 + 10));
  return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
}

function getThemeStylesForColor() {
  return {
    brandGradient: 'bg-tenant-gradient',
    activeNavBg: 'active-nav-tenant',
    primaryButtonBg: 'btn-tenant-primary',
    badgeBg: 'badge-tenant-primary',
    textHighlight: 'text-tenant-primary',
    tableHeaderBg: 'table-header-tenant',
    tableHeaderCell: 'table-header-cell-tenant',
    cardHeaderBanner: 'card-header-banner-tenant'
  };
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const cachedAppName = localStorage.getItem('dms_tenant_app_name');
      const cachedAppNameHighlight = localStorage.getItem('dms_tenant_app_highlight');
      const cachedAppSubtitle = localStorage.getItem('dms_tenant_app_subtitle');
      const cachedCompanyName = localStorage.getItem('dms_tenant_company_name');
      const cachedLogoUrl = localStorage.getItem('dms_tenant_logo_url');

      if (cachedAppName || cachedAppNameHighlight || cachedAppSubtitle || cachedCompanyName || cachedLogoUrl) {
        return {
          ...APP_CONFIG,
          appName: cachedAppName !== null ? cachedAppName : APP_CONFIG.appName,
          appNameHighlight: cachedAppNameHighlight !== null ? cachedAppNameHighlight : APP_CONFIG.appNameHighlight,
          appSubtitle: cachedAppSubtitle !== null ? cachedAppSubtitle : APP_CONFIG.appSubtitle,
          companyName: cachedCompanyName !== null ? cachedCompanyName : APP_CONFIG.companyName,
          logoUrl: cachedLogoUrl !== null ? cachedLogoUrl : APP_CONFIG.logoUrl,
        };
      }
    } catch (e) {}
    return APP_CONFIG;
  });
  const [primaryColorHex, setPrimaryColorHex] = useState<string>(() => {
    return localStorage.getItem('dms_tenant_theme_color') || '#2563eb';
  });

  const applyDynamicCssVariables = (hexColor: string) => {
    if (typeof document === 'undefined') return;
    try {
      localStorage.setItem('dms_tenant_theme_color', hexColor);
    } catch (e) {}

    const { r, g, b } = hexToRgb(hexColor);
    const hoverHex = adjustBrightness(r, g, b, 0.85);
    const gradientEndHex = generateGradientEnd(r, g, b);
    const root = document.documentElement;

    root.style.setProperty('--tenant-primary', hexColor);
    root.style.setProperty('--tenant-primary-rgb', `${r}, ${g}, ${b}`);
    root.style.setProperty('--tenant-primary-hover', hoverHex);
    root.style.setProperty('--tenant-gradient-start', hexColor);
    root.style.setProperty('--tenant-gradient-end', gradientEndHex);
    root.style.setProperty('--tenant-primary-light-bg', `rgba(${r}, ${g}, ${b}, 0.08)`);
    root.style.setProperty('--tenant-primary-dark-bg', `rgba(${r}, ${g}, ${b}, 0.22)`);
    root.style.setProperty('--tenant-primary-light-border', `rgba(${r}, ${g}, ${b}, 0.25)`);
    root.style.setProperty('--tenant-primary-dark-border', `rgba(${r}, ${g}, ${b}, 0.45)`);
    root.style.setProperty('--tenant-primary-text', hexColor);
    root.style.setProperty('--tenant-ring-color', `rgba(${r}, ${g}, ${b}, 0.25)`);
  };

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
        applyDynamicCssVariables(tenantPrimaryHex);

        const dynamicStyles = getThemeStylesForColor();

        const newAppName = dbTheme['Theme.AppName'];
        const newAppNameHighlight = dbTheme['Theme.AppNameHighlight'];
        const newAppSubtitle = dbTheme['Tenant.Name'] ? ` ${dbTheme['Tenant.Name']}` : dbTheme['Theme.AppSubtitle'];
        const newCompanyName = dbTheme['Company.Name'] || dbTheme['Theme.CompanyName'];
        const newLogoUrl = dbTheme['Theme.LogoUrl'];

        try {
          if (newAppName) localStorage.setItem('dms_tenant_app_name', newAppName);
          if (newAppNameHighlight) localStorage.setItem('dms_tenant_app_highlight', newAppNameHighlight);
          if (newAppSubtitle) localStorage.setItem('dms_tenant_app_subtitle', newAppSubtitle);
          if (newCompanyName) localStorage.setItem('dms_tenant_company_name', newCompanyName);
          if (newLogoUrl) localStorage.setItem('dms_tenant_logo_url', newLogoUrl);
        } catch (e) {}

        setConfig((prev) => ({
          ...prev,
          appName: dbTheme['Theme.AppName'] || prev.appName,
          appNameHighlight: dbTheme['Theme.AppNameHighlight'] || prev.appNameHighlight,
          appSubtitle: dbTheme['Tenant.Name'] ? ` ${dbTheme['Tenant.Name']}` : (dbTheme['Theme.AppSubtitle'] || prev.appSubtitle),
          companyName: dbTheme['Company.Name'] || dbTheme['Theme.CompanyName'] || prev.companyName,
          supportEmail: dbTheme['Theme.SupportEmail'] || prev.supportEmail,
          copyrightText: dbTheme['Theme.CopyrightText'] || prev.copyrightText,
          logoUrl: dbTheme['Theme.LogoUrl'] || prev.logoUrl,
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
      } else {
        applyDynamicCssVariables('#2563eb');
      }
    } catch (err) {
      applyDynamicCssVariables('#2563eb');
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

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const fullTitle = `${config.appName} ${config.appNameHighlight}`.trim();
      document.title = fullTitle ? `${fullTitle} v2.5` : 'Enterprise DMS';
    }
  }, [config.appName, config.appNameHighlight]);

  return (
    <ThemeContext.Provider value={{ config, primaryColorHex, refreshTheme: fetchThemeSettings }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

