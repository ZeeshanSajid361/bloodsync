/**
 * useAdminData — custom hook for the admin dashboard.
 *
 * Exposes paginated data fetchers for hospitals, requests, users, and analytics,
 * plus mutation helpers for approve/reject/block/revoke actions.
 */

import { useState, useCallback } from 'react';
import api from '../lib/api';

export default function useAdminData() {
  const [analytics,  setAnalytics]  = useState(null);
  const [hospitals,  setHospitals]  = useState({ orgs: [], total: 0 });
  const [requests,   setRequests]   = useState({ requests: [], total: 0 });
  const [users,      setUsers]      = useState({ users: [], total: 0 });
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  /* ── Fetchers ──────────────────────────────────────────────────────────── */

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/analytics');
      setAnalytics(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHospitals = useCallback(async (status = '', type = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (type)   params.set('type', type);
      const { data } = await api.get(`/admin/hospitals?${params}`);
      setHospitals(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load hospitals.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRequests = useCallback(async (status = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const { data } = await api.get(`/admin/requests?${params}`);
      setRequests(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (role = '', search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (role)   params.set('role', role);
      if (search) params.set('search', search);
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Hospital mutations ────────────────────────────────────────────────── */

  async function approveHospital(id, note = '') {
    const { data } = await api.patch(`/admin/hospitals/${id}/approve`, { note });
    return data; // contains rawKey — caller must display it
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

