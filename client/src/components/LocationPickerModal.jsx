import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Navigation, ExternalLink, CheckCircle2, X, Loader2, Search, ZoomIn, ZoomOut } from 'lucide-react';
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

export default function LocationPickerModal({ isOpen, onClose, onSelectLocation, initialLocation = {} }) {
  const [lat, setLat]                 = useState(initialLocation.latitude || 33.6844);
  const [lng, setLng]                 = useState(initialLocation.longitude || 73.0479);
  const [addressText, setAddressText] = useState(initialLocation.street || initialLocation.address || '');
  const [city, setCity]               = useState(initialLocation.city || 'Islamabad');
  const [province, setProvince]       = useState(initialLocation.province || 'Punjab');
  const [mapsUrl, setMapsUrl]         = useState(initialLocation.mapsUrl || '');

  const [loading, setLoading]         = useState(false);
  const [geocoding, setGeocoding]     = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const markerRef       = useRef(null);

  useEffect(() => {
    if (initialLocation.latitude && initialLocation.longitude) {
      setLat(initialLocation.latitude);
      setLng(initialLocation.longitude);
    } else if (initialLocation.city) {
      const key = initialLocation.city.toLowerCase().trim();
      if (CITY_COORDS[key]) {
        setLat(CITY_COORDS[key].lat);
        setLng(CITY_COORDS[key].lng);
      }
    }
  }, [initialLocation]);

  // Freeze scroll when modal open
  useEffect(() => {
    if (!isOpen) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isOpen]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function initLeafletMap() {
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

      const redIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="
          background: #ef4444;
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid #ffffff;
          box-shadow: 0 4px 16px rgba(239,68,68,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
        "><div style="width: 10px; height: 10px; background: #ffffff; border-radius: 50%;"></div></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
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
        maxZoom: 20,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxNativeZoom: 19,
        maxZoom: 20,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], { icon: redIcon, draggable: true }).addTo(map);
      markerRef.current = marker;

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 250);

      // Map click -> move pin & reverse geocode
      map.on('click', (e) => {
        const clickedLat = parseFloat(e.latlng.lat.toFixed(6));
        const clickedLng = parseFloat(e.latlng.lng.toFixed(6));
        setLat(clickedLat);
        setLng(clickedLng);
        marker.setLatLng([clickedLat, clickedLng]);
        const genUrl = `https://www.google.com/maps/search/?api=1&query=${clickedLat},${clickedLng}`;
        setMapsUrl(genUrl);
        setShowResultsDropdown(false);
        reverseGeocode(clickedLat, clickedLng);
      });

      // Marker dragend -> update position
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const draggedLat = parseFloat(pos.lat.toFixed(6));
        const draggedLng = parseFloat(pos.lng.toFixed(6));
        setLat(draggedLat);
        setLng(draggedLng);
        const genUrl = `https://www.google.com/maps/search/?api=1&query=${draggedLat},${draggedLng}`;
        setMapsUrl(genUrl);
        setShowResultsDropdown(false);
        reverseGeocode(draggedLat, draggedLng);
      });
    }

    const timer = setTimeout(initLeafletMap, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Direct pan & fly helper — Smoothly flies to target lat/lng at high zoom level (18)
  function panMapTo(latitude, longitude, zoom = 18) {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([latitude, longitude], zoom, { duration: 1.2 });
      markerRef.current.setLatLng([latitude, longitude]);
    }
  }

  if (!isOpen) return null;

  function extractCityFromQuery(q) {
    if (!q) return null;
    const lower = q.toLowerCase();
    for (const c of Object.keys(CITY_COORDS)) {
      if (lower.includes(c)) {
        return c.charAt(0).toUpperCase() + c.slice(1);
      }
    }
    return null;
  }

  // GPS Device Auto-Detect
  function handleDetectGps() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.', { id: 'gps-toast' });
      return;
    }
    setLoading(true);
    toast.loading('Detecting GPS position…', { id: 'gps-toast' });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude  = parseFloat(pos.coords.latitude.toFixed(6));
        const longitude = parseFloat(pos.coords.longitude.toFixed(6));
        setLat(latitude);
        setLng(longitude);
        panMapTo(latitude, longitude, 18);
        setSearchQuery('');
        setShowResultsDropdown(false);
        const generatedUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        setMapsUrl(generatedUrl);
        
        await reverseGeocode(latitude, longitude);
        setLoading(false);
        toast.success('Your current GPS location detected!', { id: 'gps-toast' });
      },
      (err) => {
        setLoading(false);
        const errMsg = err.code === 1 
          ? 'GPS access denied. Click map to point location manually.' 
          : 'Could not fetch GPS location.';
        toast.error(errMsg, { id: 'gps-toast' });
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

const MEDICAL_ACRONYMS = {
  imc: 'Islamabad Medical Complex',
  pims: 'Pakistan Institute of Medical Sciences',
  cmh: 'Combined Military Hospital',
  mh: 'Military Hospital',
  bbh: 'Benazir Bhutto Hospital',
  ric: 'Rawalpindi Institute of Cardiology',
  rgh: 'Rawalpindi General Hospital',
  skmch: 'Shaukat Khanum Memorial Cancer Hospital',
  siut: 'Sindh Institute of Urology and Transplantation',
  nicvd: 'National Institute of Cardiovascular Diseases',
  jpmc: 'Jinnah Postgraduate Medical Centre',
  akuh: 'Aga Khan University Hospital',
  lrh: 'Lady Reading Hospital',
  kth: 'Khyber Teaching Hospital',
  hmc: 'Hayatabad Medical Complex',
  fuih: 'Fauji Foundation Hospital',
  ffh: 'Fauji Foundation Hospital',
  krl: 'KRL Hospital',
  nescom: 'Nescom Hospital',
  nori: 'NORI Hospital Islamabad',
  shifa: 'Shifa International Hospital',
  maroof: 'Maroof International Hospital',
  qih: 'Quaid-e-Azam International Hospital',
};

function expandSearchQuery(queryText) {
  if (!queryText) return '';
  let text = queryText.trim();
  for (const [abbr, full] of Object.entries(MEDICAL_ACRONYMS)) {
    const reg = new RegExp(`\\b${abbr}\\b`, 'gi');
    if (reg.test(text)) {
      text = text.replace(reg, full);
    }
  }
  return text.replace(/hospital\s+hospital/gi, 'Hospital').trim();
}

  // Reverse geocode via OpenStreetMap Nominatim
  async function reverseGeocode(latitude, longitude) {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        { headers: { 'User-Agent': 'BloodSync-App/1.0 (contact@bloodsync.app)' } }
      );
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const detectedCity = addr.city || addr.town || addr.county || addr.state_district || city;
        const detectedStreet = [addr.suburb, addr.neighbourhood, addr.road, addr.amenity, addr.hospital, addr.building].filter(Boolean).join(', ');
        const detectedProvince = addr.state || province;

        setCity(detectedCity);
        if (detectedStreet) setAddressText(detectedStreet);
        setProvince(detectedProvince);
      }
    } catch (e) {
      console.warn('Reverse geocode failed:', e);
    } finally {
      setGeocoding(false);
    }
  }

  // Select location result from search dropdown
  function handleSelectSearchResult(item) {
    const latitude  = parseFloat(parseFloat(item.lat).toFixed(6));
    const longitude = parseFloat(parseFloat(item.lon).toFixed(6));

    panMapTo(latitude, longitude, 18);
    setLat(latitude);
    setLng(longitude);

    const addr = item.address || {};
    const detectedCity = addr.city || addr.town || addr.village || addr.county || addr.state_district || extractCityFromQuery(item.display_name) || city;
    const streetParts = [addr.hospital, addr.amenity, addr.building, addr.road, addr.suburb, addr.neighbourhood].filter(Boolean);
    const detectedStreet = streetParts.join(', ') || item.display_name.split(',')[0];
    const detectedProvince = addr.state || province;

    setCity(detectedCity);
    setAddressText(detectedStreet);
    setProvince(detectedProvince);

    const generatedUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    setMapsUrl(generatedUrl);

    setShowResultsDropdown(false);
    setSearchResults([]);
    toast.success(`📍 Pinned: ${item.display_name.split(',')[0]}`, { id: 'gps-toast' });
  }

  // Smart Location Search Engine (Coordinates, Acronym Expansion, Nominatim + Photon Fallback)
  async function handleSearchLocation(e) {
    if (e) e.preventDefault();
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return;

    setGeocoding(true);
    setSearchResults([]);
    setShowResultsDropdown(false);

    // 1. Direct Lat/Lng or Google Maps URL pattern check (e.g. @33.6492048,73.0170415)
    const coordsMatch = rawQuery.match(/@?(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (coordsMatch) {
      const latitude  = parseFloat(parseFloat(coordsMatch[1]).toFixed(6));
      const longitude = parseFloat(parseFloat(coordsMatch[2]).toFixed(6));
      panMapTo(latitude, longitude, 18);
      setLat(latitude);
      setLng(longitude);
      const genUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      setMapsUrl(genUrl);
      await reverseGeocode(latitude, longitude);
      toast.success(`📍 Pinned Google Maps coordinates (${latitude}, ${longitude})`, { id: 'gps-toast' });
      setGeocoding(false);
      return;
    }

    // 2. Acronym expansion (e.g., 'imc' => 'Islamabad Medical Complex')
    const expandedQuery = expandSearchQuery(rawQuery);
    const cleanQuery = expandedQuery.replace(/\s*\([^)]*\)/g, '').trim();

    const headers = { 'User-Agent': 'BloodSync-App/1.0 (contact@bloodsync.app)' };
    let results = [];

    try {
      // Tier A: Nominatim expanded query restricted to Pakistan
      let res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&addressdetails=1&limit=8&countrycodes=pk`,
        { headers }
      );
      results = await res.json();

      // Tier B: Nominatim raw query restricted to Pakistan
      if (!results || results.length === 0) {
        res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(rawQuery)}&addressdetails=1&limit=8&countrycodes=pk`,
          { headers }
        );
        results = await res.json();
      }

      // Tier C: Photon API fallback with current Lat/Lng proximity bias
      if (!results || results.length === 0) {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&lat=${lat}&lon=${lng}&limit=8`;
        res = await fetch(photonUrl);
        const data = await res.json();
        if (data && data.features) {
          results = data.features.map(f => ({
            display_name: [f.properties.name, f.properties.street, f.properties.city, f.properties.state, f.properties.country].filter(Boolean).join(', '),
            lat: String(f.geometry.coordinates[1]),
            lon: String(f.geometry.coordinates[0]),
            address: {
              city: f.properties.city,
              road: f.properties.street,
              hospital: f.properties.name,
              state: f.properties.state,
            }
          }));
        }
      }

      if (results && results.length > 0) {
        setSearchResults(results);
        setShowResultsDropdown(true);
        handleSelectSearchResult(results[0]);
      } else {
        // Fallback — move to city center if available
        const detectedCity = extractCityFromQuery(rawQuery) || city;
        const cityCoord = CITY_COORDS[detectedCity.toLowerCase()];
        if (cityCoord) {
          panMapTo(cityCoord.lat, cityCoord.lng, 15);
          setLat(cityCoord.lat);
          setLng(cityCoord.lng);
        }
        setCity(detectedCity);
        setAddressText(rawQuery);
        const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawQuery)}`;
        setMapsUrl(googleSearchUrl);
        toast(`📌 "${rawQuery}" not found precisely — displaying ${detectedCity} region`, { id: 'gps-toast' });
      }
    } catch (err) {
      toast.error('Location search failed. Check your network connection.', { id: 'gps-toast' });
    } finally {
      setGeocoding(false);
    }
  }

  function handleConfirm() {
    const finalUrl = mapsUrl || (lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery || addressText)}`);
    onSelectLocation({
      latitude:  lat,
      longitude: lng,
      street:    addressText,
      address:   addressText,
      city,
      province,
      mapsUrl:   finalUrl,
    });
    toast.success('Location confirmed!', { id: 'gps-toast' });
    onClose();
  }

  const modalContent = (
    <div
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999,
        background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px',
        touchAction: 'none'
      }}
    >
      {/* Outer card — fixed max height, flex column so footer always visible */}
      <div className="card" style={{
        width: '100%', maxWidth: '640px',
        height: 'min(700px, calc(100vh - 24px))',
        display: 'flex', flexDirection: 'column',
        background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '16px', padding: '16px 20px',
        overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
        position: 'relative',
      }}>

        {/* ── FIXED TOP: Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
            <MapPin size={18} color="#ef4444" /> Pin Exact Location on Interactive Map
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={18} />
          </button>
        </div>

        {/* ── FIXED: Search Bar + GPS + Autocomplete Dropdown ── */}
        <div style={{ marginBottom: '10px', flexShrink: 0, position: 'relative', zIndex: 9999 }}>
          <form onSubmit={handleSearchLocation} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                className="input"
                style={{ fontSize: '0.85rem', padding: '8px 14px', width: '100%' }}
                placeholder="Search hospital, building, street, or area..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={geocoding} style={{ padding: '8px 16px', background: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontWeight: 700 }}>
              {geocoding ? <Loader2 size={15} className="spin" /> : <Search size={15} />}
              <span>Search</span>
            </button>
            <button type="button" onClick={handleDetectGps} className="btn btn-secondary btn-sm" disabled={loading} style={{ padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontWeight: 600 }} title="Detect GPS Position">
              {loading ? <Loader2 size={15} className="spin" /> : <Navigation size={15} />}
              <span>GPS</span>
            </button>
          </form>

          {/* Autocomplete Search Results Menu */}
          {showResultsDropdown && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
              background: '#1e293b', border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '10px', maxHeight: '180px', overflowY: 'auto', zIndex: 10000,
              boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
            }}>
              <div style={{ padding: '6px 12px', fontSize: '0.72rem', color: '#94a3b8', background: '#0f172a', fontWeight: 700 }}>
                SELECT MATCHING LOCATION ({searchResults.length} FOUND):
              </div>
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSearchResult(item)}
                  style={{
                    padding: '8px 12px', fontSize: '0.8rem', color: '#f8fafc',
                    borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <MapPin size={14} color="#38bdf8" style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.display_name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── FIXED: Interactive Leaflet Map with Zoom level 20 ── */}
        <div style={{
          position: 'relative', width: '100%', height: '240px', flexShrink: 0,
          borderRadius: '12px', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.15)', marginBottom: '10px', background: '#1e293b'
        }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
          <div style={{
            position: 'absolute', bottom: '10px', left: '10px', zIndex: 1000, background: 'rgba(15, 23, 42, 0.92)',
            padding: '4px 12px', borderRadius: '16px', fontSize: '0.74rem', color: '#34d399', fontWeight: 700,
            border: '1px solid rgba(16, 185, 129, 0.4)', backdropFilter: 'blur(4px)', pointerEvents: 'none'
          }}>
            📍 Click map or drag red marker ({lat.toFixed(6)}, {lng.toFixed(6)})
          </div>
        </div>

        {/* ── SCROLLABLE: Form Fields ── */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '4px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>City *</label>
              <input
                className="input"
                style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Islamabad"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>Province</label>
              <input
                className="input"
                style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                value={province}
                onChange={e => setProvince(e.target.value)}
                placeholder="e.g. Punjab"
              />
            </div>

            <div className="input-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
              <label className="input-label" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>Street Address / Landmark</label>
              <input
                className="input"
                style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                value={addressText}
                onChange={e => setAddressText(e.target.value)}
                placeholder="e.g. Islamabad Medical Complex, Sector H-8/1"
              />
            </div>

            <div className="input-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
              <label className="input-label" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>Google Maps Link (Auto-Generated)</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  className="input"
                  style={{ fontSize: '0.78rem', padding: '6px 10px', flex: 1 }}
                  value={mapsUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                  onChange={e => setMapsUrl(e.target.value)}
                  placeholder="Google Maps URL"
                />
                <a
                  href={mapsUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ textDecoration: 'none', color: '#60a5fa', fontSize: '0.78rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
                >
                  <ExternalLink size={13} /> Open
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── FIXED BOTTOM: Footer Actions ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '0.82rem', padding: '8px 16px' }}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleConfirm}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#10b981', color: '#fff', fontSize: '0.82rem', padding: '8px 18px', fontWeight: 700 }}
          >
            <CheckCircle2 size={16} /> Confirm Location Pin
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
