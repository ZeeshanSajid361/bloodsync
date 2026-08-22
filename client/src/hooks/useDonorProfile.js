/**
 * Custom hook — donor dashboard data.
 *
 * Implements Stale-While-Revalidate caching via localStorage so donor profiles
 * render instantly (0ms delay) upon login or tab switching, while fetching latest updates in the background.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';

const DONOR_CACHE_KEY = 'bloodsync_donor_profile_cache';

export function useDonorProfile() {
  const [donor, setDonor] = useState(() => {
    try {
      const cached = localStorage.getItem(DONOR_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const donorRef = useRef(donor);
  donorRef.current = donor;

  const [loading, setLoading] = useState(() => !donor);
  const [error, setError]   = useState('');

  const fetch = useCallback(async (isSilent = false) => {
    if (!donorRef.current && !isSilent) {
      setLoading(true);
    }
    setError('');
    try {
      const { data } = await api.get('/donors/me');
      setDonor(data.data);
      localStorage.setItem(DONOR_CACHE_KEY, JSON.stringify(data.data));
    } catch (err) {
      if (!donorRef.current) {
        setError(err.response?.data?.message || 'Failed to load donor profile.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(!!donorRef.current);
  }, [fetch]);

  return { donor, loading, error, refetch: fetch };
}
