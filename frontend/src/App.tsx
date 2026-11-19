import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { AdminPage } from './features/admin/AdminPage';
import { DesignShowcase } from './features/design/DesignShowcase';
import { PriceTagNav } from './components/nav/PriceTagNav';
import { CommandPalette } from './components/ui/CommandPalette';

function AppContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [period, setPeriod] = useState('Oct 2026');

  return (
    <div className="min-h-screen bg-shelf text-ink flex flex-col">
      <PriceTagNav
        currentRole={user?.role || 'Viewer'}
        userName={user?.name || 'Guest Viewer'}
        currentPeriod={period}
        onPeriodChange={setPeriod}
        onOpenCommandPalette={() => setCmdOpen(true)}
        onLogout={() => {
          logout();
          navigate('/login');
        }}
      />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/design" element={<DesignShowcase />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <div className="p-8 bg-tile rounded-tile border border-hairline shadow-shelf">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-serif text-3xl text-ink">Retail Inflation Tracker</span>
                  <span className="text-xs font-mono bg-cocoa text-white px-2 py-0.5 rounded-full">
                    {user?.role || 'Guest'}
                  </span>
                </div>
                <p className="text-muted text-sm max-w-2xl leading-relaxed mb-6">
                  Monitoring essential household baskets, validating prices across districts, and calculating fixed-weight Laspeyres price indices.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to="/design"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-cocoa text-white text-xs font-medium hover:bg-cocoa-deep transition-colors shadow-shelf"
                  >
                    View "Shelf Tag" Design System Showcase (/design)
                  </Link>
                  {!user && (
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-hairline bg-tile hover:bg-cocoa-wash/40 text-xs font-medium text-ink transition-colors shadow-shelf"
                    >
                      Sign In to Account
                    </Link>
                  )}
                </div>
              </div>
            }
          />
        </Routes>
      </main>

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
