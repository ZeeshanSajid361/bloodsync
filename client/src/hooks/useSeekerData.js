/**
 * Custom hooks — seeker dashboard data.
 *
 * useSeekerRequests  — fetches GET /api/seekers/requests/mine
 * useCompatibility   — fetches GET /api/seekers/compatibility for a blood group
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const SEEKER_CACHE_KEY = 'bloodsync_seeker_requests_cache';

// ── useSeekerRequests ──────────────────────────────────────────────────────
export function useSeekerRequests() {
  const [requests, setRequests] = useState(() => {
    try {
      const cached = localStorage.getItem(SEEKER_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => requests.length === 0);
  const [error,   setError]   = useState('');
  const [total,   setTotal]   = useState(() => requests.length);

  const fetch = useCallback(async () => {
    if (requests.length === 0) setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/seekers/requests/mine?limit=50');
      setRequests(data.data.requests);
      setTotal(data.data.total);
      localStorage.setItem(SEEKER_CACHE_KEY, JSON.stringify(data.data.requests));
    } catch (err) {
      if (requests.length === 0) {
        setError(err.response?.data?.message || 'Failed to load your requests.');
      }
    } finally {
      setLoading(false);
    }
  }, [requests.length]);

  useEffect(() => { fetch(); }, [fetch]);

  return { requests, loading, error, total, refetch: fetch };
}

// ── useDonorSearch ──────────────────────────────────────────────────────────
export function useDonorSearch() {
  const [results,       setResults]       = useState(null);     // null = not yet searched
  const [hospitalStock, setHospitalStock] = useState([]);
  const [summary,       setSummary]       = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  const search = useCallback(async (patientBloodGroup, city) => {
    setLoading(true);
    setError('');
    setResults(null);
    setHospitalStock([]);
    try {
      const params = new URLSearchParams({ patientBloodGroup });
      if (city) params.set('city', city);

      const { data } = await api.get(`/seekers/search?${params.toString()}`);
      setResults(data.data.results || []);
      setHospitalStock(data.data.hospitalStock || []);
      setSummary(data.data.compatibilitySummary);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, hospitalStock, summary, loading, error, search };
}
