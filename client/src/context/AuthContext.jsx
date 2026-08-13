/**
 * Auth context — session state and authentication actions.
 *
 * Persists { user, accessToken, refreshToken } to localStorage so the session
 * survives page refreshes. The context provides login, logout, and a flag
 * indicating whether the initial auth check has completed (used by
 * ProtectedRoute to avoid flashing the login page on hard refresh).
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

function prefetchDashboardChunk(role) {
  try {
    switch (role) {
      case 'donor':    import('../pages/dashboard/DonorDashboard'); break;
      case 'seeker':   import('../pages/dashboard/SeekerDashboard'); break;
      case 'hospital': import('../pages/dashboard/HospitalDashboard'); break;
      case 'admin':    import('../pages/dashboard/AdminDashboard'); break;
      case 'partner':  import('../pages/dashboard/PartnerDashboard'); break;
      default: break;
    }
  } catch {
    // Ignore prefetch failures silently
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until initial hydration done

  // ── Hydrate from localStorage on first render ─────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // Corrupted data — start fresh.
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
    if (storedUser?.role) {
      prefetchDashboardChunk(storedUser.role);
    }
  }, []);

  const login = useCallback(({ user: userData, accessToken, refreshToken }) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
    if (userData?.role) {
      prefetchDashboardChunk(userData.role);
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    // Best-effort server-side invalidation — don't block on failure.
    api.post('/auth/logout', { refreshToken }).catch(() => {});

    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('bloodsync_donor_profile_cache');
    localStorage.removeItem('bloodsync_hospital_profile_cache');
    localStorage.removeItem('bloodsync_seeker_requests_cache');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Convenience hook — throws if used outside AuthProvider.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
