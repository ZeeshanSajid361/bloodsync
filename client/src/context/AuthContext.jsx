/**
 * Auth context ΓÇö session state and authentication actions.
 *
 * Persists { user, accessToken, refreshToken } to localStorage so the session
 * survives page refreshes. The context provides login, logout, and a flag
 * indicating whether the initial auth check has completed (used by
 * ProtectedRoute to avoid flashing the login page on hard refresh).
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import cacheService from '../utils/CacheService';

const AuthContext = createContext(null);

export function clearAllUserDataCache() {
  cacheService.clear();
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('bloodsync_') || key.startsWith('app_cache:') || key.startsWith('donor_profile'))) {
        if (!key.startsWith('bloodsync_verif_resend_') && !key.startsWith('bloodsync_spotlight_tour_')) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.error('Error clearing app cache:', e);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until initial hydration done

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
        setLoading(false); // Instant hydration from cache (0ms delay!)
      } catch {
        localStorage.removeItem('user');
      }
    }
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          if (res.data?.data) {
            setUser((prev) => {
              const next = { ...prev, ...res.data.data };
              localStorage.setItem('user', JSON.stringify(next));
              return next;
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(({ user: userData, accessToken, refreshToken }) => {
    const newUserId = userData?._id || userData?.id;
    let prevUserId = null;
    try {
      const prevUserStr = localStorage.getItem('user');
      if (prevUserStr) {
        const prev = JSON.parse(prevUserStr);
        prevUserId = prev?._id || prev?.id;
      }
    } catch {}

    // Only clear cache if logging in as a DIFFERENT user account to prevent cross-account leak while keeping instant load
    if (newUserId && prevUserId && String(newUserId) !== String(prevUserId)) {
      clearAllUserDataCache();
    }

    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);

    // Fire parallel role data pre-fetch immediately upon login to pre-warm cache before dashboard mounts
    setTimeout(() => {
      try {
        if (userData?.role === 'hospital') {
          api.get('/hospitals/me').then(res => {
            if (res.data?.data) localStorage.setItem('bloodsync_hospital_profile_cache', JSON.stringify(res.data.data));
          }).catch(() => {});
        } else if (userData?.role === 'donor') {
          api.get('/donors/me').then(res => {
            if (res.data?.data) cacheService.set('donor_profile', res.data.data);
          }).catch(() => {});
        } else if (userData?.role === 'seeker') {
          api.get('/seekers/requests/mine?limit=50').then(res => {
            if (res.data?.data?.requests) localStorage.setItem('bloodsync_seeker_requests_cache', JSON.stringify(res.data.data.requests));
          }).catch(() => {});
        } else if (userData?.role === 'admin' && newUserId) {
          api.get('/admin/analytics').then(res => {
            if (res.data?.data) localStorage.setItem(`bloodsync_admin_analytics_${newUserId}`, JSON.stringify(res.data.data));
          }).catch(() => {});
        }
      } catch {}
    }, 0);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    // Best-effort server-side invalidation — don't block on failure.
    api.post('/auth/logout', { refreshToken }).catch(() => {});

    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    clearAllUserDataCache();
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => {
      const next = { ...prev, ...updatedUserData };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Convenience hook ΓÇö throws if used outside AuthProvider.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
