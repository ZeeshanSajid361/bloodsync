/**
 * Custom hook — donor dashboard data.
 *
 * Implements SWR caching via CacheService (RAM + Session Storage) for instant 0ms rendering
 * upon login and tab switching, while fetching updates in the background.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import cacheService from '../utils/CacheService';

import { useAuth } from '../context/AuthContext';

export function useDonorProfile() {
  const { user } = useAuth();
  const userId = user?._id || user?.id || '';
  const cacheKey = userId ? `donor_profile_${userId}` : null;

  const [donor, setDonor] = useState(() => cacheKey ? cacheService.get(cacheKey) : null);

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
      if (cacheKey) cacheService.set(cacheKey, data.data);
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
