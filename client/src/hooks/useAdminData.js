/**
 * useAdminData — custom hook for the admin dashboard.
 *
 * Implements Stale-While-Revalidate localStorage caching for instant 0ms rendering
 * across all admin dashboard tabs (Analytics, Hospitals, Requests, Users).
 */

import { useState, useCallback, useRef } from 'react';
import api from '../lib/api';

const CACHE_ANALYTICS = 'bloodsync_admin_analytics_cache';
const CACHE_HOSPITALS = 'bloodsync_admin_hospitals_cache';
const CACHE_REQUESTS  = 'bloodsync_admin_requests_cache';
const CACHE_USERS     = 'bloodsync_admin_users_cache';

export default function useAdminData() {
  const [analytics, setAnalytics] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_ANALYTICS);
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });

  const [hospitals, setHospitals] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_HOSPITALS);
      return cached ? JSON.parse(cached) : { orgs: [], total: 0 };
    } catch { return { orgs: [], total: 0 }; }
  });

  const [requests, setRequests] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_REQUESTS);
      return cached ? JSON.parse(cached) : { requests: [], total: 0 };
    } catch { return { requests: [], total: 0 }; }
  });

  const [users, setUsers] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_USERS);
      return cached ? JSON.parse(cached) : { users: [], total: 0 };
    } catch { return { users: [], total: 0 }; }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  /* ── Fetchers ──────────────────────────────────────────────────────────── */

  const fetchAnalytics = useCallback(async (isSilent = false) => {
    try {
      if (!analytics && !isSilent) setLoading(true);
      const { data } = await api.get('/admin/analytics');
      setAnalytics(data.data);
      localStorage.setItem(CACHE_ANALYTICS, JSON.stringify(data.data));
    } catch (err) {
      if (!analytics) setError(err.response?.data?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [analytics]);

  const fetchHospitals = useCallback(async (status = '', type = '', isSilent = false) => {
    try {
      if ((!hospitals.orgs || hospitals.orgs.length === 0) && !isSilent) setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (type)   params.set('type', type);
      const { data } = await api.get(`/admin/hospitals?${params}`);
      setHospitals(data.data);
      if (!status && !type) localStorage.setItem(CACHE_HOSPITALS, JSON.stringify(data.data));
    } catch (err) {
      if (!hospitals.orgs || hospitals.orgs.length === 0) setError(err.response?.data?.message || 'Failed to load hospitals.');
    } finally {
      setLoading(false);
    }
  }, [hospitals.orgs]);

  const fetchRequests = useCallback(async (status = '', isSilent = false) => {
    try {
      if ((!requests.requests || requests.requests.length === 0) && !isSilent) setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const { data } = await api.get(`/admin/requests?${params}`);
      setRequests(data.data);
      if (!status) localStorage.setItem(CACHE_REQUESTS, JSON.stringify(data.data));
    } catch (err) {
      if (!requests.requests || requests.requests.length === 0) setError(err.response?.data?.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [requests.requests]);

  const fetchUsers = useCallback(async (role = '', search = '', isSilent = false) => {
    try {
      if ((!users.users || users.users.length === 0) && !isSilent) setLoading(true);
      const params = new URLSearchParams();
      if (role)   params.set('role', role);
      if (search) params.set('search', search);
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.data);
      if (!role && !search) localStorage.setItem(CACHE_USERS, JSON.stringify(data.data));
    } catch (err) {
      if (!users.users || users.users.length === 0) setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [users.users]);

  /* ── Hospital mutations ────────────────────────────────────────────────── */

  async function approveHospital(id, note = '') {
    const { data } = await api.patch(`/admin/hospitals/${id}/approve`, { note });
    return data;
  }

  async function rejectHospital(id, note) {
    const { data } = await api.patch(`/admin/hospitals/${id}/reject`, { note });
    return data;
  }

  async function revokeApiKey(id) {
    const { data } = await api.post(`/admin/hospitals/${id}/revoke-key`);
    return data;
  }

  async function regenerateApiKey(id) {
    const { data } = await api.post(`/admin/hospitals/${id}/regenerate-key`);
    return data;
  }

  /* ── Request mutations ─────────────────────────────────────────────────── */

  async function approveRequest(id, note = '') {
    const { data } = await api.patch(`/admin/requests/${id}/approve`, { note });
    return data;
  }

  async function rejectRequest(id, note) {
    const { data } = await api.patch(`/admin/requests/${id}/reject`, { note });
    return data;
  }

  async function fulfillRequest(id) {
    const { data } = await api.patch(`/admin/requests/${id}/fulfill`);
    return data;
  }

  /* ── User mutations ────────────────────────────────────────────────────── */

  async function toggleBlock(id, block) {
    const { data } = await api.patch(`/admin/users/${id}/block`, { block });
    return data;
  }

  async function deleteUser(id) {
    const { data } = await api.delete(`/admin/users/${id}`);
    return data;
  }

  return {
    analytics, hospitals, requests, users,
    loading, error,
    fetchAnalytics, fetchHospitals, fetchRequests, fetchUsers,
    approveHospital, rejectHospital, revokeApiKey, regenerateApiKey,
    approveRequest, rejectRequest, fulfillRequest,
    toggleBlock, deleteUser,
  };
}
