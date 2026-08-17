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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until initial hydration done

  // ΓöÇΓöÇ Hydrate from localStorage on first render ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // Corrupted data ΓÇö start fresh.
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(({ user: userData, accessToken, refreshToken }) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    // Best-effort server-side invalidation ΓÇö don't block on failure.
    api.post('/auth/logout', { refreshToken }).catch(() => {});

    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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
