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

import { useAuth } from '../context/AuthContext';

// ── useSeekerRequests ──────────────────────────────────────────────────────
export function useSeekerRequests() {
  const { user } = useAuth();
  const userId = user?._id || user?.id || '';
  const cacheKey = userId ? `bloodsync_seeker_requests_${userId}` : null;

  const [requests, setRequests] = useState(() => {
    if (!cacheKey) return [];
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : [];
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
      if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(data.data.requests));
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
