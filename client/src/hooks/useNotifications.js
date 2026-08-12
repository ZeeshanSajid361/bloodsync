/**
 * useNotifications — manages in-app notification state and push subscription.
 *
 * Features:
 *  - Polls /api/notifications/unread-count every 30s for the badge
 *  - Fetches full notification list on demand
 *  - Registers the service worker and push subscription on mount
 *  - Exposes markRead, markAllRead, dismiss helpers
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const POLL_INTERVAL_MS = 60_000; // 60 seconds (reduces serverless invocation frequency)

/**
 * Convert a base64 VAPID public key to a Uint8Array for the push subscription.
 */
function urlBase64ToUint8Array(base64String) {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData  = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function useNotifications() {
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [notifications,  setNotifications]  = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [panelOpen,      setPanelOpen]      = useState(false);
  const intervalRef = useRef(null);

  /* ── Fetch unread count (for badge) ──────────────────────────────────── */

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data.data.count);
    } catch {
      // Silently fail — badge is non-critical.
    }
  }, []);

  /* ── Fetch full notification list (for panel) ────────────────────────── */

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications?limit=20');
      setNotifications(data.data.notifications);
      setUnreadCount(data.data.unreadCount);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Mutations ───────────────────────────────────────────────────────── */

  const markRead = useCallback(async (id) => {
    setNotifications(prev =>
      prev.map(n => n._id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.patch('/notifications/read-all');
    } catch { /* ignore */ }
  }, []);

  const dismiss = useCallback(async (id) => {
    setNotifications(prev => {
      const target = prev.find(n => n._id === id);
      if (target && !target.isRead) {
        setUnreadCount(uc => Math.max(0, uc - 1));
      }
      return prev.filter(n => n._id !== id);
    });
    try {
      await api.delete(`/notifications/${id}`);
    } catch { /* ignore */ }
  }, []);

  /* ── Push subscription registration ─────────────────────────────────── */

  const registerPush = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!VAPID_PUBLIC_KEY) return;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await api.post('/notifications/subscribe', sub.toJSON());
    } catch (err) {
      // Non-fatal: dev environment may not support push.
      console.debug('[push] Could not register push subscription:', err.message);
    }
  }, []);

  /* ── Mount: register SW + start polling ─────────────────────────────── */

  useEffect(() => {
    fetchUnreadCount();
    registerPush();

    intervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchUnreadCount, registerPush]);

  /* ── Toggle panel ────────────────────────────────────────────────────── */

  const togglePanel = useCallback(() => {
    setPanelOpen(prev => {
      if (!prev) fetchNotifications(); // fetch on open
      return !prev;
    });
  }, [fetchNotifications]);

  return {
    unreadCount, notifications, loading,
    panelOpen, togglePanel,
    markRead, markAllRead, dismiss,
    refetch: fetchNotifications,
  };
}
