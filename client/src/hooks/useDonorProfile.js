/**
 * Custom hook — donor dashboard data with Stale-While-Revalidate (SWR) caching.
 *
 * Loads cached donor data instantly from localStorage (0ms render time)
 * while fetching fresh profile data from GET /api/donors/me in the background.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';

const CACHE_KEY = 'bloodsync_donor_profile_cache';

export function useDonorProfile() {
  const [donor, setDonor] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const donorRef = useRef(donor);
  donorRef.current = donor;

  const [loading, setLoading] = useState(() => !donor);
  const [error,   setError]   = useState('');

  const fetch = useCallback(async (isSilent = false) => {
    // Only show full loading skeleton if we have no cached data at all
    if (!isSilent && !donorRef.current) {
      setLoading(true);
    }
    try {
      const { data } = await api.get('/donors/me');
      setDonor(data.data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data.data));
      setError('');
    } catch (err) {
      console.error('Failed to load donor profile:', err);
      if (!donorRef.current) {
        setError(err.response?.data?.message || 'Failed to load donor profile.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const toggleAvailability = useCallback(async (newAvailableStatus) => {
    const snapshot = donorRef.current;
    if (!snapshot) return;

    // 1. Optimistic instant UI update (0ms delay)
    const updated = {
      ...snapshot,
      profile: { ...snapshot.profile, isAvailable: newAvailableStatus },
    };
    setDonor(updated);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    } catch {}

    // 2. Server request with snapshot rollback on error
    try {
      const { data } = await api.patch('/donors/me/availability', { isAvailable: newAvailableStatus });
      if (data?.data) {
        setDonor(data.data);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data.data));
      }
    } catch (err) {
      console.error('Optimistic availability toggle failed, rolling back snapshot:', err);
      setDonor(snapshot);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
      } catch {}
      throw err;
    }
  }, []);

  return { donor, loading, error, refetch: fetch, toggleAvailability };
}

