import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Navigation, ExternalLink, CheckCircle2, X, Loader2, Search, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const CITY_COORDS = {
  islamabad:  { lat: 33.6844, lng: 73.0479 },
  rawalpindi: { lat: 33.5989, lng: 73.0441 },
  lahore:     { lat: 31.5204, lng: 74.3587 },
  karachi:    { lat: 24.8607, lng: 67.0011 },
  peshawar:   { lat: 34.0151, lng: 71.5249 },
  multan:     { lat: 30.1575, lng: 71.5249 },
  faisalabad: { lat: 31.4504, lng: 73.1350 },
  quetta:     { lat: 30.1798, lng: 66.9750 },
};

const CITY_ALIASES = {
  rawal: 'Rawalpindi',
  rwp: 'Rawalpindi',
  isb: 'Islamabad',
  lhr: 'Lahore',
  khi: 'Karachi',
  psh: 'Peshawar',
  mup: 'Multan',
  fsd: 'Faisalabad',
};

const MEDICAL_ACRONYMS = {
  imc: 'Islamabad Medical Complex (IMC)',
  pims: 'Pakistan Institute of Medical Sciences (PIMS)',
  cmh: 'Combined Military Hospital (CMH)',
  mh: 'Military Hospital (MH)',
  bbh: 'Benazir Bhutto Hospital (BBH)',
  ric: 'Rawalpindi Institute of Cardiology (RIC)',
  rgh: 'Holy Family Hospital / RGH',
  skmch: 'Shaukat Khanum Memorial Cancer Hospital',
  siut: 'Sindh Institute of Urology and Transplantation (SIUT)',
  nicvd: 'National Institute of Cardiovascular Diseases (NICVD)',
  jpmc: 'Jinnah Postgraduate Medical Centre (JPMC)',
  akuh: 'Aga Khan University Hospital (AKUH)',
  lrh: 'Lady Reading Hospital (LRH)',
  kth: 'Khyber Teaching Hospital (KTH)',
  hmc: 'Hayatabad Medical Complex (HMC)',
  fuih: 'Fauji Foundation Hospital',
  ffh: 'Fauji Foundation Hospital',
  krl: 'KRL Hospital',
  nescom: 'Nescom Hospital',
  nori: 'NORI Hospital Islamabad',
  shifa: 'Shifa International Hospital',
  maroof: 'Maroof International Hospital',
  qih: 'Quaid-e-Azam International Hospital',
};

const CITY_PROVINCE_MAP = {
  islamabad: 'Islamabad Capital Territory',
  rawalpindi: 'Punjab',
  lahore: 'Punjab',
  faisalabad: 'Punjab',
  multan: 'Punjab',
  sialkot: 'Punjab',
  gujranwala: 'Punjab',
  sargodha: 'Punjab',
  bahawalpur: 'Punjab',
  gujrat: 'Punjab',
  jhelum: 'Punjab',
  attock: 'Punjab',
  chakwal: 'Punjab',
  'rahim yar khan': 'Punjab',
  karachi: 'Sindh',
  hyderabad: 'Sindh',
  sukkur: 'Sindh',
  larkana: 'Sindh',
  peshawar: 'Khyber Pakhtunkhwa',
  abbottabad: 'Khyber Pakhtunkhwa',
  mardan: 'Khyber Pakhtunkhwa',
  swat: 'Khyber Pakhtunkhwa',
  kohat: 'Khyber Pakhtunkhwa',
  haripur: 'Khyber Pakhtunkhwa',
  quetta: 'Balochistan',
  gwadar: 'Balochistan',
  gilgit: 'Gilgit-Baltistan',
  skardu: 'Gilgit-Baltistan',
  muzaffarabad: 'Azad Jammu & Kashmir',
};

function getProvinceForCity(cityName) {
  if (!cityName || typeof cityName !== 'string') return 'Islamabad Capital Territory';
  const key = cityName.toLowerCase().trim();
  return CITY_PROVINCE_MAP[key] || 'Punjab';
}

function formatSearchAddress(queryText) {
  if (!queryText || typeof queryText !== 'string') return '';
  let text = queryText.trim();

  // Expand shorthand city aliases
  for (const [alias, fullCity] of Object.entries(CITY_ALIASES)) {
    const reg = new RegExp(`\\b${alias}\\b`, 'gi');
    text = text.replace(reg, fullCity);
  }

  // Expand medical acronyms
  for (const [abbr, full] of Object.entries(MEDICAL_ACRONYMS)) {
    const reg = new RegExp(`\\b${abbr}\\b`, 'gi');
    if (reg.test(text)) {
      text = text.replace(reg, full);
    }
  }

  text = text.split(' ')
    .map(w => (w.length <= 4 && w === w.toUpperCase()) ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return text.replace(/Hospital\s+Hospital/gi, 'Hospital').trim();
}

function extractCityFromQuery(q) {
  if (!q || typeof q !== 'string') return null;
  const lower = q.toLowerCase();
  for (const c of Object.keys(CITY_COORDS)) {
    if (lower.includes(c)) {
      return c.charAt(0).toUpperCase() + c.slice(1);
    }
  }
  for (const [alias, fullCity] of Object.entries(CITY_ALIASES)) {
    if (lower.includes(alias)) {
      return fullCity;
    }
  }
  return null;
}

export default function LocationPickerModal({ isOpen, onClose, onSelectLocation, initialLocation = {} }) {
  const safeInit   = initialLocation && typeof initialLocation === 'object' ? initialLocation : {};
  const safeCity   = typeof safeInit.city === 'string' && safeInit.city.trim() ? safeInit.city.trim() : 'Islamabad';
  const safeStreet = typeof safeInit.street === 'string' ? safeInit.street : (typeof safeInit.address === 'string' ? safeInit.address : '');

  const [lat, setLat]                 = useState(typeof safeInit.latitude === 'number' && !isNaN(safeInit.latitude) ? safeInit.latitude : 33.6844);
  const [lng, setLng]                 = useState(typeof safeInit.longitude === 'number' && !isNaN(safeInit.longitude) ? safeInit.longitude : 73.0479);
  const [addressText, setAddressText] = useState(safeStreet);
  const [city, setCity]               = useState(safeCity);
  const [province, setProvince]       = useState(typeof safeInit.province === 'string' && safeInit.province.trim() ? safeInit.province.trim() : getProvinceForCity(safeCity));
  const [mapsUrl, setMapsUrl]         = useState(typeof safeInit.mapsUrl === 'string' && safeInit.mapsUrl.trim() ? safeInit.mapsUrl.trim() : '');

  const [loading, setLoading]                 = useState(false);
  const [geocoding, setGeocoding]             = useState(false);
  const [searchQuery, setSearchQuery]         = useState(safeStreet);
  const [debouncedQuery, setDebouncedQuery]   = useState(safeStreet);
  const [searchResults, setSearchResults]     = useState([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [mapMode, setMapMode]                 = useState('google'); // 'google' or 'leaflet'

  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const markerRef       = useRef(null);

  // Synchronize state when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const init = initialLocation && typeof initialLocation === 'object' ? initialLocation : {};
    const initCity = typeof init.city === 'string' && init.city.trim() ? init.city.trim() : 'Islamabad';
    const initStreet = typeof init.street === 'string' ? init.street : (typeof init.address === 'string' ? init.address : '');

    const initialLat = typeof init.latitude === 'number' && !isNaN(init.latitude) ? init.latitude : (CITY_COORDS[initCity.toLowerCase()]?.lat || 33.6844);
    const initialLng = typeof init.longitude === 'number' && !isNaN(init.longitude) ? init.longitude : (CITY_COORDS[initCity.toLowerCase()]?.lng || 73.0479);

    setLat(initialLat);
    setLng(initialLng);
    setAddressText(initStreet);
    setSearchQuery(initStreet);
    setDebouncedQuery(initStreet);
    setCity(initCity);
    setProvince(typeof init.province === 'string' && init.province.trim() ? init.province.trim() : getProvinceForCity(initCity));
    setMapsUrl(typeof init.mapsUrl === 'string' && init.mapsUrl.trim() ? init.mapsUrl.trim() : `https://www.google.com/maps?q=${initialLat},${initialLng}`);
    setSearchResults([]);
    setShowResultsDropdown(false);
    setMapMode('google');
  }, [isOpen, initialLocation]);

  // Debounce searchQuery for live Google Map embed updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync province whenever city changes
  useEffect(() => {
    if (city && typeof city === 'string') {
      setProvince(getProvinceForCity(city));
    }
  }, [city]);

  // Prevent background body scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevBody = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
    };
  }, [isOpen]);

  // Smoothly pan map to target coordinates
  function panMapTo(latitude, longitude, zoom = 17) {
    setLat(latitude);
    setLng(longitude);
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([latitude, longitude], zoom, { duration: 1.2 });
      markerRef.current.setLatLng([latitude, longitude]);
    }
  }

  // Reverse geocoding helper (OpenStreetMap Nominatim)
  const fetchAddressFromCoords = async (targetLat, targetLng) => {
    setGeocoding(true);
    const genUrl = `https://www.google.com/maps?q=${targetLat},${targetLng}`;
    setMapsUrl(genUrl);

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}&zoom=18&addressdetails=1`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      
      if (data && data.address) {
        const addr = data.address;
        const detCity = addr.city || addr.town || addr.municipality || addr.county || addr.city_district || addr.suburb || city || 'Islamabad';
        const detProv = addr.state || addr.region || getProvinceForCity(detCity);
        
        const mainRoad = addr.hospital || addr.amenity || addr.road || addr.suburb || addr.neighbourhood || '';
        const cleanAddress = mainRoad ? `${mainRoad}, ${detCity}` : (data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : detCity);

        setCity(detCity);
        setProvince(detProv);
        setAddressText(cleanAddress);
        setSearchQuery(cleanAddress);
      }
    } catch (e) {
      console.warn('Reverse geocode fallback:', e);
      setAddressText(`Location Pin (${targetLat}, ${targetLng})`);
    } finally {
      setGeocoding(false);
    }
  };

  // Live Debounced Autocomplete Search as user types in Search Input
  useEffect(() => {
    if (!isOpen) return;
    const query = searchQuery.trim();
    if (!query || query.length < 3) {
      setSearchResults([]);
      setShowResultsDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      const formatted = formatSearchAddress(query);
      const cleanQuery = formatted.replace(/,\s*/g, ' ');
      
      try {
        const [photonRes, nomRes] = await Promise.allSettled([
          fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery + ' Pakistan')}&limit=6`),
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ' Pakistan')}&addressdetails=1&limit=6&countrycodes=pk`)
        ]);

        let items = [];

        if (nomRes.status === 'fulfilled' && nomRes.value.ok) {
          const nomData = await nomRes.value.json();
          if (Array.isArray(nomData)) {
            items.push(...nomData.map(d => ({
              lat: parseFloat(d.lat),
              lon: parseFloat(d.lon),
              display_name: d.display_name,
              address: d.address || {},
            })));
          }
        }

        if (photonRes.status === 'fulfilled' && photonRes.value.ok) {
          const photonData = await photonRes.value.json();
          if (photonData?.features) {
            items.push(...photonData.features.map(f => {
              const p = f.properties || {};
              const coords = f.geometry?.coordinates || [];
              const nameParts = [p.name, p.street, p.district, p.city, p.state].filter(Boolean);
              return {
                lat: coords[1],
                lon: coords[0],
                display_name: nameParts.join(', ') || p.name || 'Location Result',
                address: {
                  city: p.city || p.district,
                  state: p.state,
                  road: p.street || p.name,
                },
              };
            }));
          }
        }

        // Deduplicate results
        const unique = [];
        for (const it of items) {
          if (!it.lat || !it.lon) continue;
          const exists = unique.some(u => Math.abs(u.lat - it.lat) < 0.001 && Math.abs(u.lon - it.lon) < 0.001);
          if (!exists) unique.push(it);
        }

        if (unique.length > 0) {
          setSearchResults(unique);
          setShowResultsDropdown(true);
        } else {
          setSearchResults([]);
          setShowResultsDropdown(false);
        }
      } catch (err) {
        console.warn('Live search error:', err);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  // Select location result from search dropdown
  function handleSelectSearchResult(item) {
    const targetLat = parseFloat(parseFloat(item.lat).toFixed(6));
    const targetLng = parseFloat(parseFloat(item.lon).toFixed(6));

    setLat(targetLat);
    setLng(targetLng);
    panMapTo(targetLat, targetLng, 17);

    const addr = item.address || {};
    const detCity = addr.city || addr.town || addr.village || addr.district || extractCityFromQuery(item.display_name) || city;
    const detProv = addr.state || getProvinceForCity(detCity);
    const cleanName = item.display_name.split(',').slice(0, 3).join(', ');

    setCity(detCity);
    setProvince(detProv);
    setAddressText(cleanName);
    setSearchQuery(cleanName);
    setDebouncedQuery(cleanName);
    setMapsUrl(`https://www.google.com/maps?q=${targetLat},${targetLng}`);

    setShowResultsDropdown(false);
    setSearchResults([]);
    toast.success(`📍 Pinned: ${cleanName.split(',')[0]}`, { id: 'gps-toast' });
  }

  // Initialize Leaflet Map when in Leaflet mode
  useEffect(() => {
    if (!isOpen || mapMode !== 'leaflet') return;
    let isMounted = true;

    async function initMap() {
      if (!document.getElementById('leaflet-css-pkg')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-pkg';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!window.L) {
        await new Promise((resolve) => {
          if (document.getElementById('leaflet-js-pkg')) {
            const timer = setInterval(() => {
              if (window.L) { clearInterval(timer); resolve(); }
            }, 50);
            return;
          }
          const script = document.createElement('script');
          script.id = 'leaflet-js-pkg';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      if (!isMounted || !mapContainerRef.current) return;
      const L = window.L;

      const customRedIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="
          background: #ef4444;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid #ffffff;
          box-shadow: 0 4px 20px rgba(239,68,68,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        "><div style="width: 10px; height: 10px; background: #ffffff; border-radius: 50%;"></div></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const initialLat = lat || 33.6844;
      const initialLng = lng || 73.0479;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        maxZoom: 19,
        zoomControl: true,
        scrollWheelZoom: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], { icon: customRedIcon, draggable: true }).addTo(map);
      markerRef.current = marker;

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);

      map.on('click', (e) => {
        const clickedLat = parseFloat(e.latlng.lat.toFixed(6));
        const clickedLng = parseFloat(e.latlng.lng.toFixed(6));
        setLat(clickedLat);
        setLng(clickedLng);
        marker.setLatLng([clickedLat, clickedLng]);
        setShowResultsDropdown(false);
        fetchAddressFromCoords(clickedLat, clickedLng);
      });

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const draggedLat = parseFloat(pos.lat.toFixed(6));
        const draggedLng = parseFloat(pos.lng.toFixed(6));
        setLat(draggedLat);
        setLng(draggedLng);
        setShowResultsDropdown(false);
        fetchAddressFromCoords(draggedLat, draggedLng);
      });
    }

    const timer = setTimeout(initMap, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, mapMode]);

  if (!isOpen) return null;

  // Detect GPS Device Location
  function handleDetectGps() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.', { id: 'gps-toast' });
      return;
    }
    setLoading(true);
    toast.loading('Detecting GPS location…', { id: 'gps-toast' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude  = parseFloat(pos.coords.latitude.toFixed(6));
        const longitude = parseFloat(pos.coords.longitude.toFixed(6));
        setLat(latitude);
        setLng(longitude);
        panMapTo(latitude, longitude, 17);
        fetchAddressFromCoords(latitude, longitude);
        setLoading(false);
        toast.success('Current GPS location pinned!', { id: 'gps-toast' });
      },
      (err) => {
        setLoading(false);
        const errMsg = err.code === 1 ? 'GPS permission denied.' : 'Unable to acquire GPS location.';
        toast.error(errMsg, { id: 'gps-toast' });
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  // Handle Search Location submit
  async function handleSearchLocation(e) {
    if (e) e.preventDefault();
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return;

    // If dropdown already has results, select the top one
    if (searchResults && searchResults.length > 0) {
      handleSelectSearchResult(searchResults[0]);
      return;
    }

    setGeocoding(true);

    // 1. Direct Lat/Lng or Google Maps URL pattern check
    const coordsMatch = rawQuery.match(/@?(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (coordsMatch) {
      const latitude  = parseFloat(parseFloat(coordsMatch[1]).toFixed(6));
      const longitude = parseFloat(parseFloat(coordsMatch[2]).toFixed(6));
      setLat(latitude);
      setLng(longitude);
      panMapTo(latitude, longitude, 17);
      fetchAddressFromCoords(latitude, longitude);
      toast.success(`📍 Coordinates pinned (${latitude}, ${longitude})`, { id: 'gps-toast' });
      setGeocoding(false);
      return;
    }

    // 2. Multi-geocoder fetch (Photon + Nominatim)
    try {
      const formatted = formatSearchAddress(rawQuery);
      const cleanQuery = formatted.replace(/,\s*/g, ' ');

      const [photonRes, nomRes] = await Promise.allSettled([
        fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery + ' Pakistan')}&limit=5`),
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ' Pakistan')}&addressdetails=1&limit=5&countrycodes=pk`)
      ]);

      let items = [];
      if (photonRes.status === 'fulfilled' && photonRes.value.ok) {
        const pData = await photonRes.value.json();
        if (pData?.features) {
          items.push(...pData.features.map(f => ({
            lat: f.geometry?.coordinates[1],
            lon: f.geometry?.coordinates[0],
            display_name: [f.properties?.name, f.properties?.street, f.properties?.city, f.properties?.state].filter(Boolean).join(', '),
            address: { city: f.properties?.city, state: f.properties?.state }
          })));
        }
      }

      if (items.length === 0 && nomRes.status === 'fulfilled' && nomRes.value.ok) {
        const nData = await nomRes.value.json();
        if (Array.isArray(nData)) {
          items.push(...nData.map(d => ({
            lat: parseFloat(d.lat),
            lon: parseFloat(d.lon),
            display_name: d.display_name,
            address: d.address || {}
          })));
        }
      }

      if (items.length > 0 && items[0].lat && items[0].lon) {
        handleSelectSearchResult(items[0]);
      } else {
        // Fallback to city center
        const detectedCity = extractCityFromQuery(rawQuery) || city || 'Islamabad';
        const cityCoord = CITY_COORDS[detectedCity.toLowerCase()] || CITY_COORDS['islamabad'];
        setLat(cityCoord.lat);
        setLng(cityCoord.lng);
        panMapTo(cityCoord.lat, cityCoord.lng, 15);
        const detProv = getProvinceForCity(detectedCity);
        setCity(detectedCity);
        setProvince(detProv);
        setAddressText(formatted);
        setMapsUrl(`https://www.google.com/maps?q=${cityCoord.lat},${cityCoord.lng}`);
        toast.success(`📍 Pinned to ${detectedCity}`, { id: 'gps-toast' });
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
      toast.error('Could not find location online. Pin manually on map.', { id: 'gps-toast' });
    } finally {
      setGeocoding(false);
    }
  }

  function handleConfirm() {
    const finalAddress = addressText || searchQuery || 'Hospital Location';
    const finalUrl = mapsUrl || `https://www.google.com/maps?q=${lat},${lng}`;
    
    onSelectLocation({
      latitude:  lat,
      longitude: lng,
      street:    finalAddress,
      address:   finalAddress,
      city:      city || 'Islamabad',
      province:  province || 'Islamabad Capital Territory',
      mapsUrl:   finalUrl,
    });
    toast.success('Location pin confirmed!', { id: 'gps-toast' });
    onClose();
  }

  // Active query for live Google Maps Embed iframe
  const activeEmbedQuery = formatSearchAddress(debouncedQuery.trim() || searchQuery.trim() || addressText || (lat && lng ? `${lat},${lng}` : `${city}, Pakistan`));

  const modalContent = (
    <div
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999,
        background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        touchAction: 'none'
      }}
    >
      {/* Outer card: Wide side-by-side split screen layout (No scrolling needed!) */}
      <div className="card" style={{
        width: '100%', maxWidth: '980px',
        height: 'min(580px, 92vh)',
        display: 'flex', flexDirection: 'row',
        background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '20px', overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
        position: 'relative',
      }}>

        {/* ── LEFT COLUMN: Real Live Google Maps View OR Interactive Leaflet Map ── */}
        <div style={{ flex: '1.2', position: 'relative', height: '100%', background: '#1e293b', display: 'flex', flexDirection: 'column' }}>
          
          {/* Mode Switcher Header over map */}
          <div style={{
            position: 'absolute', top: '12px', left: '12px', zIndex: 1000,
            display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.9)',
            padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(6px)'
          }}>
            <button
              type="button"
              className={`btn btn-sm ${mapMode === 'google' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMapMode('google')}
              style={{
                fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: mapMode === 'google' ? '#2563eb' : 'transparent', fontWeight: mapMode === 'google' ? 700 : 500,
                borderRadius: '6px', color: '#fff'
              }}
            >
              <Globe size={13} color="#60a5fa" /> Live Google Map
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mapMode === 'leaflet' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMapMode('leaflet')}
              style={{
                fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: mapMode === 'leaflet' ? '#2563eb' : 'transparent', fontWeight: mapMode === 'leaflet' ? 700 : 500,
                borderRadius: '6px', color: '#fff'
              }}
            >
              <MapPin size={13} color="#ef4444" /> Interactive Pin Map
            </button>
          </div>

          {/* MAP AREA */}
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {mapMode === 'google' ? (
              <iframe
                title="Real Google Map View"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(activeEmbedQuery)}&t=&z=17&ie=UTF8&iwloc=&output=embed`}
              />
            ) : (
              <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
            )}
          </div>
          
          {/* Live Pinned Badge Over Map */}
          <div style={{
            position: 'absolute', bottom: '16px', left: '16px', zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.92)', padding: '8px 14px', borderRadius: '12px',
            fontSize: '0.78rem', color: '#34d399', fontWeight: 700,
            border: '1px solid rgba(16, 185, 129, 0.4)', backdropFilter: 'blur(6px)',
            pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
          }}>
            <MapPin size={16} color="#ef4444" />
            <span>📍 Map View: {activeEmbedQuery}</span>
          </div>

        </div>

        {/* ── RIGHT COLUMN: Search, Controls & Auto-Filled Details Panel ── */}
        <div style={{
          flex: '1', display: 'flex', flexDirection: 'column',
          padding: '20px 24px', background: '#0f172a',
          borderLeft: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden'
        }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                <MapPin size={20} color="#ef4444" /> Pin Location Details
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Type address to update live Google Map instantly</p>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px', borderRadius: '50%' }}>
              <X size={18} />
            </button>
          </div>

          {/* Search Bar & GPS Button with Autocomplete Dropdown */}
          <div style={{ marginBottom: '16px', flexShrink: 0, position: 'relative', zIndex: 99999 }}>
            <form onSubmit={handleSearchLocation} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  className="input"
                  style={{ fontSize: '0.85rem', padding: '10px 14px', width: '100%', borderRadius: '10px' }}
                  placeholder="Type address, hospital, landmark (e.g. Allama iqbal street 39, rawalpindi)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setShowResultsDropdown(true); }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={geocoding}
                style={{ padding: '10px 16px', background: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontWeight: 700, borderRadius: '10px' }}
              >
                {geocoding ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                <span>Search</span>
              </button>
              <button
                type="button"
                onClick={handleDetectGps}
                className="btn btn-secondary btn-sm"
                disabled={loading}
                style={{ padding: '10px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontWeight: 600, borderRadius: '10px' }}
                title="Detect GPS Position"
              >
                {loading ? <Loader2 size={16} className="spin" /> : <Navigation size={16} />}
                <span>GPS</span>
              </button>
            </form>

            {/* Live Autocomplete Results Dropdown Menu */}
            {showResultsDropdown && searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px',
                background: '#1e293b', border: '1px solid rgba(59, 130, 246, 0.5)',
                borderRadius: '12px', maxHeight: '180px', overflowY: 'auto', zIndex: 100000,
                boxShadow: '0 16px 36px rgba(0,0,0,0.85)',
              }}>
                <div style={{ padding: '6px 12px', fontSize: '0.72rem', color: '#94a3b8', background: '#0f172a', fontWeight: 700, letterSpacing: '0.5px' }}>
                  MATCHING LOCATIONS ({searchResults.length} FOUND):
                </div>
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSearchResult(item)}
                    style={{
                      padding: '10px 14px', fontSize: '0.82rem', color: '#f8fafc',
                      borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <MapPin size={15} color="#38bdf8" style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                      {item.display_name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Fields: All visible in single view without scrolling! */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: '4px', fontWeight: 700 }}>City *</label>
                <input
                  className="input"
                  style={{ fontSize: '0.85rem', padding: '8px 12px', borderRadius: '8px' }}
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Islamabad"
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: '4px', fontWeight: 700 }}>Province / State</label>
                <input
                  className="input"
                  style={{ fontSize: '0.85rem', padding: '8px 12px', borderRadius: '8px' }}
                  value={province}
                  onChange={e => setProvince(e.target.value)}
                  placeholder="e.g. Punjab"
                />
              </div>
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: '4px', fontWeight: 700 }}>Street Address / Landmark</label>
              <input
                className="input"
                style={{ fontSize: '0.85rem', padding: '8px 12px', borderRadius: '8px' }}
                value={addressText}
                onChange={e => setAddressText(e.target.value)}
                placeholder="e.g. PIMS Hospital, Sector G-8/3"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: '4px', fontWeight: 700 }}>Google Maps Shareable URL</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="input"
                  style={{ fontSize: '0.8rem', padding: '8px 12px', flex: 1, borderRadius: '8px' }}
                  value={mapsUrl || `https://www.google.com/maps?q=${encodeURIComponent(activeEmbedQuery)}`}
                  onChange={e => setMapsUrl(e.target.value)}
                  placeholder="Google Maps URL"
                />
                <a
                  href={mapsUrl || `https://www.google.com/maps?q=${encodeURIComponent(activeEmbedQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ textDecoration: 'none', color: '#60a5fa', fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0, borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.3)' }}
                >
                  <ExternalLink size={14} /> Open
                </a>
              </div>
            </div>

          </div>

          {/* Footer Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '0.85rem', padding: '10px 18px', borderRadius: '10px' }}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleConfirm}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#10b981', color: '#fff', fontSize: '0.85rem', padding: '10px 22px', fontWeight: 800, borderRadius: '10px' }}
            >
              <CheckCircle2 size={18} /> Confirm Location Pin
            </button>
          </div>

        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
