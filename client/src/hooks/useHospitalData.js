/**
 * useHospitalData — custom hook for the hospital dashboard.
 *
 * Exposes:
 *   profile  — { org, inventory } fetched from GET /api/hospitals/me
 *   loading  — initial fetch state
 *   error    — any fetch error
 *   refetch  — manually re-request the latest data
 *
 * All mutation helpers (save inventory, broadcast, cancel) are returned so
 * HospitalDashboard.jsx stays free of direct API calls.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const CACHE_KEY = 'bloodsync_hospital_profile_cache';

export default function useHospitalData() {
  const { user } = useAuth();
  const userId = user?._id || user?.id || '';

  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      // Validate owner match so another user's cache is ignored
      const ownerId = parsed?.org?.owner?._id || parsed?.org?.owner;
      if (ownerId && userId && String(ownerId) !== String(userId)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const profileRef = useRef(profile);
  profileRef.current = profile;

  const [loading, setLoading] = useState(() => !profile);
  const [error,   setError]   = useState('');

  const fetchProfile = useCallback(async () => {
    if (!profileRef.current) {
      setLoading(true);
    }
    setError('');
    try {
      const { data } = await api.get('/hospitals/me');
      setProfile(data.data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data.data));
    } catch (err) {
      // 404 means the user hasn't registered their org yet — that's normal.
      if (err.response?.status === 404) {
        setProfile(null);
        localStorage.removeItem(CACHE_KEY);
      } else {
        if (!profileRef.current) {
          setError(err.response?.data?.message || 'Failed to load hospital data.');
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  /* ── Mutations ─────────────────────────────────────────────────────────── */

  /**
   * Register or update the org profile.
   * @param {object} payload - { name, type, city, street, province, phone, email }
   * @param {boolean} isUpdate - true → PUT, false → POST
   */
  async function saveProfile(payload, isUpdate = false) {
    const isFormData = payload instanceof FormData;
    const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
    
    const { data } = isUpdate
      ? await api.put('/hospitals/me', payload, config)
      : await api.post('/hospitals/register', payload, config);
    await fetchProfile();
    return data;
  }

  /**
   * Upsert an inventory entry.
   * @param {object} payload - { bloodGroup, units, expiresAt, lowStockThreshold }
   */
  async function saveInventory(payload) {
    const { data } = await api.post('/hospitals/inventory', payload);
    await fetchProfile();
    return data;
  }

  /**
   * Update an existing inventory record by its ID.
   * @param {string} id
   * @param {object} payload - { units, expiresAt, lowStockThreshold }
   */
  async function updateInventory(id, payload) {
    const { data } = await api.put(`/hospitals/inventory/${id}`, payload);
    await fetchProfile();
    return data;
  }

  /**
   * Remove an inventory entry.
   * @param {string} id
   */
  async function removeInventory(id) {
    const { data } = await api.delete(`/hospitals/inventory/${id}`);
    await fetchProfile();
    return data;
  }

  /**
   * Issue a Code Red broadcast on an inventory record.
   * @param {string} inventoryId
   * @param {string} message - Optional custom alert message
   */
  async function issueCodeRed(inventoryId, message) {
    const { data } = await api.post('/hospitals/broadcast', { inventoryId, message });
    await fetchProfile();
    return data;
  }

  /**
   * Cancel an active Code Red broadcast.
   * @param {string} inventoryId
   */
  async function cancelCodeRed(inventoryId) {
    const { data } = await api.delete(`/hospitals/broadcast/${inventoryId}`);
    await fetchProfile();
    return data;
  }

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    saveProfile,
    saveInventory,
    updateInventory,
    removeInventory,
    issueCodeRed,
    cancelCodeRed,
  };
}
