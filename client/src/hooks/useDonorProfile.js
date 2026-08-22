/**
 * Custom hook — donor dashboard data.
 *
 * Implements SWR caching via CacheService (RAM + Session Storage) for instant 0ms rendering
 * upon login and tab switching, while fetching updates in the background.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import cacheService from '../utils/CacheService';

const CACHE_KEY = 'donor_profile';

export function useDonorProfile() {
  const [donor, setDonor] = useState(() => cacheService.get(CACHE_KEY));

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
      cacheService.set(CACHE_KEY, data.data);
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
