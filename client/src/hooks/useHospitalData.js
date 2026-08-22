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
import { useAuth } from '../context/AuthContext';

export default function useHospitalData() {
  const { user } = useAuth();
  const userId = user?._id || user?.id || '';
  const cacheKey = userId ? `bloodsync_hospital_profile_${userId}` : null;

  const [profile, setProfile] = useState(() => {
    if (!cacheKey) return null;
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
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
      if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(data.data));
    } catch (err) {
      // 404 means the user hasn't registered their org yet — that's normal.
      if (err.response?.status !== 404) {
        if (!profileRef.current) {
          setError(err.response?.data?.message || 'Failed to load hospital data.');
        }
      } else {
        setProfile(null);
        if (cacheKey) localStorage.removeItem(cacheKey);
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

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
