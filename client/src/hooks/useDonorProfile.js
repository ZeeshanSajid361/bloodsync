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

  return { donor, loading, error, refetch: fetch };
}

