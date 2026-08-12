/**
 * Application root.
 *
 * Wraps the router in AuthProvider so every page has access to the auth
 * context. react-hot-toast is mounted once here so toasts are available
 * globally without additional setup in individual components.
 *
 * Dashboard pages are lazy-loaded so each user role only downloads the
 * bundle chunk they actually need — not all 5 dashboards at once.
 */

import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/routing/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// ── Eagerly loaded — small, needed before auth resolves ────────────────────
import RegisterPage       from './pages/auth/RegisterPage';
import LoginPage          from './pages/auth/LoginPage';
import VerifyEmailPage    from './pages/auth/VerifyEmailPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage  from './pages/auth/ResetPasswordPage';
import LandingPage        from './pages/public/LandingPage';
import QRVerifyPage       from './pages/qr/QRVerifyPage';
import DashboardPage      from './pages/dashboard/DashboardPage';

// ── Lazy-loaded dashboards — each becomes its own JS chunk ─────────────────
// A donor user downloads only DonorDashboard; hospital users only HospitalDashboard.
const DonorDashboard    = lazy(() => import('./pages/dashboard/DonorDashboard'));
const SeekerDashboard   = lazy(() => import('./pages/dashboard/SeekerDashboard'));
const HospitalDashboard = lazy(() => import('./pages/dashboard/HospitalDashboard'));
const AdminDashboard    = lazy(() => import('./pages/dashboard/AdminDashboard'));
const PartnerDashboard  = lazy(() => import('./pages/dashboard/PartnerDashboard'));

/** Minimal dark-theme loading state shown while a dashboard chunk downloads. */
function DashboardLoader() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base, #0a0f1e)',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#e53e3e',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Loading dashboard…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<DashboardLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/"                element={<LandingPage />} />
            <Route path="/register"        element={<RegisterPage />} />
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/verify-email"    element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password"  element={<ResetPasswordPage />} />

            {/* QR donation verify — public so hospitals can scan without logging in */}
            <Route path="/qr/verify/:token" element={<QRVerifyPage />} />

            {/* Generic /dashboard resolves to the role-specific dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleDashboard />
                </ProtectedRoute>
              }
            />

            {/* Donor dashboard */}
            <Route
              path="/dashboard/donor"
              element={
                <ProtectedRoute roles={['donor']}>
                  <DonorDashboard />
                </ProtectedRoute>
              }
            />

            {/* Seeker dashboard */}
            <Route
              path="/dashboard/seeker"
              element={
                <ProtectedRoute roles={['seeker']}>
                  <SeekerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Hospital dashboard */}
            <Route
              path="/dashboard/hospital"
              element={
                <ProtectedRoute roles={['hospital']}>
                  <HospitalDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin dashboard */}
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Partner dashboard */}
            <Route
              path="/dashboard/partner"
              element={
                <ProtectedRoute roles={['partner']}>
                  <PartnerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Placeholder for any role-specific sub-routes */}
            <Route
              path="/dashboard/:role"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {/* 404 fallback */}
            <Route
              path="*"
              element={
                <div
                  style={{
                    minHeight: '100dvh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-4)',
                  }}
                >
                  <span style={{ fontSize: '4rem' }}>🔍</span>
                  <h2>Page not found</h2>
                  <a href="/" className="btn btn-ghost">Go home</a>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>

      {/* Toast notifications — position top-right, dark theme */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--surface-float)',
            color: 'var(--text-primary)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
          },
        }}
      />
    </AuthProvider>
  );
}

/**
 * Reads the authenticated user's role and redirects to the correct dashboard.
 * This lets /dashboard work as a universal entry point regardless of role.
 */
function RoleDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const destinations = {
    donor:    '/dashboard/donor',
    seeker:   '/dashboard/seeker',
    hospital: '/dashboard/hospital',
    admin:    '/dashboard/admin',
    partner:  '/dashboard/partner',
  };

  return <Navigate to={destinations[user.role] || '/dashboard/donor'} replace />;
}

