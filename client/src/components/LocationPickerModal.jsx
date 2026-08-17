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
  return null;
}

export default function LocationPickerModal({ isOpen, onClose, onSelectLocation, initialLocation = {} }) {
  const safeInit   = initialLocation && typeof initialLocation === 'object' ? initialLocation : {};
  const safeCity   = typeof safeInit.city === 'string' && safeInit.city.trim() ? safeInit.city.trim() : 'Islamabad';
  const safeStreet = typeof safeInit.street === 'string' ? safeInit.street : (typeof safeInit.address === 'string' ? safeInit.address : '');

  const [lat, setLat]                 = useState(typeof safeInit.latitude === 'number' ? safeInit.latitude : 33.6844);
  const [lng, setLng]                 = useState(typeof safeInit.longitude === 'number' ? safeInit.longitude : 73.0479);
  const [addressText, setAddressText] = useState(safeStreet);
  const [city, setCity]               = useState(safeCity);
  const [province, setProvince]       = useState(typeof safeInit.province === 'string' ? safeInit.province : getProvinceForCity(safeCity));
  const [mapsUrl, setMapsUrl]         = useState(typeof safeInit.mapsUrl === 'string' ? safeInit.mapsUrl : '');

  const [mapMode, setMapMode]         = useState('leaflet'); // 'leaflet' | 'google'
  const [loading, setLoading]         = useState(false);
  const [geocoding, setGeocoding]     = useState(false);
  const [searchQuery, setSearchQuery] = useState(safeStreet);
  const [searchResults, setSearchResults] = useState([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const markerRef       = useRef(null);

  // Sync state safely when modal opens or initialLocation changes
  useEffect(() => {
    if (!isOpen) return;
    const init = initialLocation && typeof initialLocation === 'object' ? initialLocation : {};
    const initCity = typeof init.city === 'string' && init.city.trim() ? init.city.trim() : 'Islamabad';
    const initStreet = typeof init.street === 'string' ? init.street : (typeof init.address === 'string' ? init.address : '');

    const initialLat = typeof init.latitude === 'number' ? init.latitude : (CITY_COORDS[initCity.toLowerCase()]?.lat || 33.6844);
    const initialLng = typeof init.longitude === 'number' ? init.longitude : (CITY_COORDS[initCity.toLowerCase()]?.lng || 73.0479);

    setLat(initialLat);
    setLng(initialLng);
    setAddressText(initStreet);
    setSearchQuery(initStreet);
    setCity(initCity);
    setProvince(typeof init.province === 'string' ? init.province : getProvinceForCity(initCity));
    setMapsUrl(typeof init.mapsUrl === 'string' ? init.mapsUrl : `https://www.google.com/maps/search/?api=1&query=${initialLat},${initialLng}`);
  }, [isOpen, initialLocation]);

  // Auto-sync province whenever city changes
  useEffect(() => {
    if (city && typeof city === 'string') {
      setProvince(getProvinceForCity(city));
    }
  }, [city]);

  // Freeze body scroll when modal is active
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

  // Initialize Leaflet Map when mapMode === 'leaflet'
  useEffect(() => {
    if (!isOpen || mapMode !== 'leaflet') return;
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

      // Map click -> move pin & set coordinates & Google Maps URL
      map.on('click', (e) => {
        const clickedLat = parseFloat(e.latlng.lat.toFixed(6));
        const clickedLng = parseFloat(e.latlng.lng.toFixed(6));
        setLat(clickedLat);
        setLng(clickedLng);
        marker.setLatLng([clickedLat, clickedLng]);
        const genUrl = `https://www.google.com/maps/search/?api=1&query=${clickedLat},${clickedLng}`;
        setMapsUrl(genUrl);
        setShowResultsDropdown(false);
      });

      // Marker dragend -> update position & Google Maps URL
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const draggedLat = parseFloat(pos.lat.toFixed(6));
        const draggedLng = parseFloat(pos.lng.toFixed(6));
        setLat(draggedLat);
        setLng(draggedLng);
        const genUrl = `https://www.google.com/maps/search/?api=1&query=${draggedLat},${draggedLng}`;
        setMapsUrl(genUrl);
        setShowResultsDropdown(false);
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
  }, [isOpen, mapMode]);

  // Smoothly pan Leaflet map to target lat/lng
  function panMapTo(latitude, longitude, zoom = 18) {
    setLat(latitude);
    setLng(longitude);
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([latitude, longitude], zoom, { duration: 1.2 });
      markerRef.current.setLatLng([latitude, longitude]);
    }
  }

  if (!isOpen) return null;

  // GPS Device Auto-Detect
  function handleDetectGps() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.', { id: 'gps-toast' });
      return;
    }
    setLoading(true);
    toast.loading('Detecting GPS position…', { id: 'gps-toast' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude  = parseFloat(pos.coords.latitude.toFixed(6));
        const longitude = parseFloat(pos.coords.longitude.toFixed(6));
        panMapTo(latitude, longitude, 18);
        const generatedUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        setMapsUrl(generatedUrl);
        setAddressText(`GPS Location (${latitude}, ${longitude})`);
        setLoading(false);
        toast.success('Your current GPS location detected!', { id: 'gps-toast' });
      },
      (err) => {
        setLoading(false);
        const errMsg = err.code === 1 
          ? 'GPS access denied.' 
          : 'Could not fetch GPS location.';
        toast.error(errMsg, { id: 'gps-toast' });
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  // Handle location search
  function handleSearchLocation(e) {
    if (e) e.preventDefault();
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return;

    setGeocoding(true);

    // 1. Direct Lat/Lng or Google Maps URL pattern check
    const coordsMatch = rawQuery.match(/@?(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (coordsMatch) {
      const latitude  = parseFloat(parseFloat(coordsMatch[1]).toFixed(6));
      const longitude = parseFloat(parseFloat(coordsMatch[2]).toFixed(6));
      panMapTo(latitude, longitude, 18);
      const genUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      setMapsUrl(genUrl);
      setAddressText(`Coordinates: ${latitude}, ${longitude}`);
      toast.success(`📍 Google Maps coordinates set (${latitude}, ${longitude})`, { id: 'gps-toast' });
      setGeocoding(false);
      return;
    }

    // 2. Acronym expansion & City + Province detection
    const formatted = formatSearchAddress(rawQuery);
    const detectedCity = extractCityFromQuery(rawQuery) || city || 'Islamabad';
    const detectedProvince = getProvinceForCity(detectedCity);

    setCity(detectedCity);
    setProvince(detectedProvince);
    setAddressText(formatted);
    
    // Pan map to city coords if available
    const cityCoord = CITY_COORDS[detectedCity.toLowerCase()];
    if (cityCoord) {
      panMapTo(cityCoord.lat, cityCoord.lng, 16);
    }

    const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatted + ' ' + detectedCity)}`;
    setMapsUrl(googleSearchUrl);

    toast.success(`📍 Location set: ${formatted}`, { id: 'gps-toast' });
    setGeocoding(false);
  }

  function handleConfirm() {
    const finalAddress = addressText || searchQuery || 'Hospital Facility';
    const finalUrl = mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(finalAddress + ' ' + city)}`;
    
    onSelectLocation({
      latitude:  lat,
      longitude: lng,
      street:    finalAddress,
      address:   finalAddress,
      city,
      province,
      mapsUrl:   finalUrl,
    });
    toast.success('Location confirmed!', { id: 'gps-toast' });
    onClose();
  }

  const activeEmbedQuery = searchQuery.trim() || addressText || (lat && lng ? `${lat},${lng}` : `${city}, Pakistan`);
  const activeGoogleMapsLink = mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeEmbedQuery)}`;

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
      {/* Outer card */}
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
            <MapPin size={18} color="#ef4444" /> Pin Exact Location on Map
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
            <X size={18} />
          </button>
        </div>

        {/* ── FIXED: Search Bar + GPS ── */}
        <div style={{ marginBottom: '10px', flexShrink: 0, position: 'relative', zIndex: 9999 }}>
          <form onSubmit={handleSearchLocation} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                className="input"
                style={{ fontSize: '0.85rem', padding: '8px 14px', width: '100%' }}
                placeholder="Search hospital, building, street, or area (e.g. imc hospital islamabad)..."
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
        </div>

        {/* ── Mode Toggle Bar ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${mapMode === 'leaflet' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMapMode('leaflet')}
              style={{
                fontSize: '0.76rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: mapMode === 'leaflet' ? '#2563eb' : 'transparent', fontWeight: mapMode === 'leaflet' ? 700 : 500
              }}
            >
              <MapPin size={13} color="#ef4444" /> Interactive Pin Map
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mapMode === 'google' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMapMode('google')}
              style={{
                fontSize: '0.76rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: mapMode === 'google' ? '#2563eb' : 'transparent', fontWeight: mapMode === 'google' ? 700 : 500
              }}
            >
              <Globe size={13} color="#60a5fa" /> Google Map View
            </button>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            {mapMode === 'leaflet' ? '📍 Click map or drag red marker to pin' : '🗺️ Live Google Maps View'}
          </div>
        </div>

        {/* ── MAP CONTAINER: Interactive Leaflet Pin Map OR Google Map Embed ── */}
        <div style={{
          position: 'relative', width: '100%', height: '260px', flexShrink: 0,
          borderRadius: '12px', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.15)', marginBottom: '10px', background: '#1e293b'
        }}>
          {mapMode === 'google' ? (
            <iframe
              title="Real Google Map View"
              width="100%"
              height="100%"
              style={{ border: 0, borderRadius: '12px' }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(activeEmbedQuery)}&t=&z=17&ie=UTF8&iwloc=&output=embed`}
            />
          ) : (
            <>
              <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
              <div style={{
                position: 'absolute', bottom: '10px', left: '10px', zIndex: 1000, background: 'rgba(15, 23, 42, 0.92)',
                padding: '4px 12px', borderRadius: '16px', fontSize: '0.74rem', color: '#34d399', fontWeight: 700,
                border: '1px solid rgba(16, 185, 129, 0.4)', backdropFilter: 'blur(4px)', pointerEvents: 'none'
              }}>
                📍 Drag marker or click map ({lat.toFixed(6)}, {lng.toFixed(6)})
              </div>
            </>
          )}
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
                placeholder="e.g. Islamabad Medical Complex (IMC), Faqir Aipee Road"
              />
            </div>

            <div className="input-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
              <label className="input-label" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>Google Maps Link (Auto-Generated)</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  className="input"
                  style={{ fontSize: '0.78rem', padding: '6px 10px', flex: 1 }}
                  value={activeGoogleMapsLink}
                  onChange={e => setMapsUrl(e.target.value)}
                  placeholder="Google Maps URL"
                />
                <a
                  href={activeGoogleMapsLink}
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
