/**
 * Custom hook ΓÇö donor dashboard data.
 *
 * Fetches GET /api/donors/me on mount and after any mutation that calls
 * the `refetch` function. Exposes loading, error, and the full donor data
 * object (profile + eligibility + level) in one place so the dashboard
 * components stay free of fetch logic.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export function useDonorProfile() {
  const [donor,   setDonor]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/donors/me');
      setDonor(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load donor profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { donor, loading, error, refetch: fetch };
}
