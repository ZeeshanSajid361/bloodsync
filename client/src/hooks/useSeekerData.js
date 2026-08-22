/**
 * Custom hooks — seeker dashboard data.
 *
 * useSeekerRequests  — fetches GET /api/seekers/requests/mine
 * useDonorSearch     — fetches GET /api/seekers/search
 *
 * FIX: Removed `requests.length` from useCallback deps in useSeekerRequests.
 * That caused an infinite loop: fetch → setRequests → requests.length changes
 * → new fetch function → useEffect fires again → repeat.
 * Fixed by using useRef to track current array length inside stable callback.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const CACHE_KEY = 'bloodsync_seeker_requests_cache';

// ── useSeekerRequests ──────────────────────────────────────────────────────
export function useSeekerRequests() {
  const { user } = useAuth();
  const userId = user?._id || user?.id || '';

  const [requests, setRequests] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return [];
      const parsed = JSON.parse(cached);
      // Validate seeker match if cached
      if (parsed.length > 0 && userId) {
        const seekerId = parsed[0]?.seeker?._id || parsed[0]?.seeker;
        if (seekerId && String(seekerId) !== String(userId)) {
          return [];
        }
      }
      return parsed;
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => requests.length === 0);
  const [error,   setError]   = useState('');
  const [total,   setTotal]   = useState(() => requests.length);

  // Ref so the stable callback can check if we have data without being in deps
  const requestsRef = useRef(requests);
  requestsRef.current = requests;

  const fetch = useCallback(async () => {
    if (requestsRef.current.length === 0) setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/seekers/requests/mine?limit=50');
      setRequests(data.data.requests);
      setTotal(data.data.total);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data.data.requests));
    } catch (err) {
      if (requestsRef.current.length === 0) {
        setError(err.response?.data?.message || 'Failed to load your requests.');
      }
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
