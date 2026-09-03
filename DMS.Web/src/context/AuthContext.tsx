import React, { createContext, useContext, useState } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  token: string | null;
  user: User | null;
  tenantCode: string;
  tenantName: string;
  isAuthenticated: boolean;
  login: (tenantCode: string, username: string, password: string) => Promise<boolean>;
  switchTenant: (newTenantCode: string, newTenantName: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('dms_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('dms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [tenantCode, setTenantCode] = useState<string>(localStorage.getItem('dms_tenant') || 'SUPERADMIN');
  const [tenantName, setTenantName] = useState<string>(localStorage.getItem('dms_tenant_name') || 'Platform Super Administrator');

  const isAuthenticated = !!token;

  const login = async (tenantCodeInput: string, username: string, password: string) => {
    try {
      const res = await api.post('/auth/login', {
        tenantCode: tenantCodeInput?.trim() || '',
        username: username?.trim(),
        password,
      });

      if (res.data.success) {
        const data = res.data.data;
        setToken(data.token);
        setTenantCode(data.tenantCode);
        setTenantName(data.tenantName);

        const userData: User = {
          userId: 1,
          username: data.username,
          email: data.email,
          roles: data.roles,
          permissions: data.permissions,
        };

        setUser(userData);
        localStorage.setItem('dms_token', data.token);
        localStorage.setItem('dms_user', JSON.stringify(userData));
        localStorage.setItem('dms_tenant', data.tenantCode);
        localStorage.setItem('dms_tenant_name', data.tenantName);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Login failed', err);
      throw err;
    }
  };

  const switchTenant = (newTenantCode: string, newTenantName: string) => {
    setTenantCode(newTenantCode);
    setTenantName(newTenantName);
    localStorage.setItem('dms_tenant', newTenantCode);
    localStorage.setItem('dms_tenant_name', newTenantName);
    window.location.reload();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('dms_token');
    localStorage.removeItem('dms_user');
    localStorage.removeItem('dms_tenant');
    localStorage.removeItem('dms_tenant_name');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ token, user, tenantCode, tenantName, isAuthenticated, login, switchTenant, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
