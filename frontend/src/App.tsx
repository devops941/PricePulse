import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './lib/api';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { AdminPage } from './features/admin/AdminPage';
import { PricesPage } from './features/prices/PricesPage';
import { HomePage } from './features/home/HomePage';
import { LandingPage } from './features/landing/LandingPage';
import { IndexPage } from './features/index_engine/IndexPage';
import { MarketsPage } from './features/markets/MarketsPage';
import { ForecastPage } from './features/forecast/ForecastPage';
import { ReviewDeskPage } from './features/review/ReviewDeskPage';
import { BulletinsPage } from './features/bulletins/BulletinsPage';
import { DesignShowcase } from './features/design/DesignShowcase';
import { AppHeader } from './components/layout/AppHeader';
import { AppSidebar } from './components/layout/AppSidebar';
import { AppFooter } from './components/layout/AppFooter';
import { CommandPalette } from './components/ui/CommandPalette';

function AppContent() {
  const { user, token, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [period, setPeriod] = useState('2024-W52');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Live count for Review Desk badge: MUST be called unconditionally at top of component
  const { data: anomaliesData } = useQuery({
    queryKey: ['pending-count'],
    queryFn: async () => {
      try {
        const res = await apiFetch<any>('/anomalies?status=pending&limit=1');
        return res?.total || (res?.items ? res.items.length : 0);
      } catch {
        return 1;
      }
    },
    enabled: !!user && !!token,
  });

  const pendingCount = typeof anomaliesData === 'number' ? anomaliesData : 1;

  // Initial session verification loader
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-shelf text-cocoa">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cocoa border-t-transparent" />
          <span className="font-serif text-sm font-bold">Verifying PricePulse session...</span>
        </div>
      </div>
    );
  }

  // Standalone Login screen (no sidebar/header)
  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    );
  }

  // Public Landing site (available publicly if navigated directly)
  if (location.pathname === '/landing') {
    return (
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
      </Routes>
    );
  }

  // STRICT AUTH GUARD: Unauthenticated users are immediately redirected to /login!
  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-shelf text-ink font-sans">
      {/* Top Header */}
      <AppHeader
        currentRole={user.role}
        userName={user.name}
        currentPeriod={period}
        onPeriodChange={setPeriod}
        onOpenCommandPalette={() => setCmdOpen(true)}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={() => {
          logout();
          navigate('/login');
        }}
      />

      {/* Body: Left Sidebar + Center Main Content */}
      <div className="flex flex-1 items-start">
        <AppSidebar
          currentRole={user.role}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          reviewCount={pendingCount}
        />

        <main className="flex-1 min-w-0 w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/index" element={<IndexPage />} />
            <Route
              path="/prices"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Analyst', 'Collector']}>
                  <PricesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="/markets" element={<MarketsPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/bulletins" element={<BulletinsPage />} />
            <Route
              path="/review"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Analyst']}>
                  <ReviewDeskPage />
                </ProtectedRoute>
              }
            />
            <Route path="/design" element={<DesignShowcase />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Bottom Footer */}
      <AppFooter />

      {/* ⌘K Command Palette Modal */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
