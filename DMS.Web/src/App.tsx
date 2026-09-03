import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { LoginView } from './features/auth/LoginView';
import { DashboardView } from './features/dashboard/DashboardView';
import { DocumentExplorer } from './features/documents/DocumentExplorer';
import { StorageManagement } from './features/storage/StorageManagement';
import { ApplicationsView } from './features/applications/ApplicationsView';
import { AuditLogView } from './features/audit/AuditLogView';
import { DocumentTypesView } from './features/documents/DocumentTypesView';
import { WebhooksView } from './features/webhooks/WebhooksView';
import { ConfigSettingsView } from './features/config/ConfigSettingsView';
import { TenantsView } from './features/tenants/TenantsView';
import { ApiManualView } from './features/api-manual/ApiManualView';
import { NotificationsView } from './features/notifications/NotificationsView';
import { RolesView } from './features/roles/RolesView';

import { ModulesView } from './features/modules/ModulesView';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginView />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardView />} />
            <Route path="tenants" element={<TenantsView />} />
            <Route path="roles" element={<RolesView />} />
            <Route path="api-manual" element={<ApiManualView />} />
            <Route path="documents" element={<DocumentExplorer />} />
            <Route path="notifications" element={<NotificationsView />} />
            <Route path="storage" element={<StorageManagement />} />
            <Route path="applications" element={<ApplicationsView />} />
            <Route path="modules" element={<ModulesView />} />
            <Route path="document-types" element={<DocumentTypesView />} />
            <Route path="config-settings" element={<ConfigSettingsView />} />
            <Route path="audit" element={<AuditLogView />} />
            <Route path="webhooks" element={<WebhooksView />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
