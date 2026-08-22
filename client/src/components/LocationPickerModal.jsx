import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Navigation, ExternalLink, CheckCircle2, X, Loader2, Search } from 'lucide-react';
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
    setCity(initCity);
    setProvince(typeof init.province === 'string' && init.province.trim() ? init.province.trim() : getProvinceForCity(initCity));
    setMapsUrl(typeof init.mapsUrl === 'string' && init.mapsUrl.trim() ? init.mapsUrl.trim() : `https://www.google.com/maps?q=${initialLat},${initialLng}`);
  }, [isOpen, initialLocation]);

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

  // Pan Leaflet map to target coordinates
  function panMapTo(latitude, longitude, zoom = 17) {
    setLat(latitude);
    setLng(longitude);
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([latitude, longitude], zoom, { duration: 1.2 });
      markerRef.current.setLatLng([latitude, longitude]);
    }
  }

  // Reverse geocode via OpenStreetMap Nominatim when map is clicked or marker dragged
  async function reverseGeocode(latitude, longitude) {
    setGeocoding(true);
    const genUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    setMapsUrl(genUrl);

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const detectedCity = addr.city || addr.town || addr.village || addr.county || addr.state_district || city || 'Islamabad';
        const detectedProvince = addr.state || getProvinceForCity(detectedCity);
        
        const streetParts = [
          addr.hospital, addr.amenity, addr.building, addr.house_number,
          addr.road, addr.suburb, addr.neighbourhood
        ].filter(Boolean);

        const detectedStreet = streetParts.length > 0
          ? streetParts.join(', ')
          : (data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : detectedCity);

        setCity(detectedCity);
        setProvince(detectedProvince);
        setAddressText(detectedStreet);
        setSearchQuery(detectedStreet);
      }
    } catch (e) {
      console.warn('Reverse geocode failed:', e);
      setAddressText(`Pinned Location (${latitude}, ${longitude})`);
    } finally {
      setGeocoding(false);
    }
  }

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen) return;
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
          width: 34px;
          height: 34px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid #ffffff;
          box-shadow: 0 4px 22px rgba(239,68,68,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        "><div style="width: 12px; height: 12px; background: #ffffff; border-radius: 50%;"></div></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
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

      // CLICK ANYWHERE ON MAP -> Move pin & update City, Province, Address, Shareable URL!
      map.on('click', (e) => {
        const clickedLat = parseFloat(e.latlng.lat.toFixed(6));
        const clickedLng = parseFloat(e.latlng.lng.toFixed(6));
        setLat(clickedLat);
        setLng(clickedLng);
        marker.setLatLng([clickedLat, clickedLng]);
        reverseGeocode(clickedLat, clickedLng);
      });

      // DRAG MARKER PIN -> Move pin & update City, Province, Address, Shareable URL!
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const draggedLat = parseFloat(pos.lat.toFixed(6));
        const draggedLng = parseFloat(pos.lng.toFixed(6));
        setLat(draggedLat);
        setLng(draggedLng);
        reverseGeocode(draggedLat, draggedLng);
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
  }, [isOpen]);

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
        panMapTo(latitude, longitude, 17);
        reverseGeocode(latitude, longitude);
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

  // Handle Location Search
  async function handleSearchLocation(e) {
    if (e) e.preventDefault();
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return;

    setGeocoding(true);

    // Direct Lat/Lng search support
    const coordsMatch = rawQuery.match(/@?(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (coordsMatch) {
      const latitude  = parseFloat(parseFloat(coordsMatch[1]).toFixed(6));
      const longitude = parseFloat(parseFloat(coordsMatch[2]).toFixed(6));
      panMapTo(latitude, longitude, 17);
      reverseGeocode(latitude, longitude);
      setGeocoding(false);
      return;
    }

    try {
      const formatted = formatSearchAddress(rawQuery);
      const cleanQuery = formatted.replace(/,\s*/g, ' ');

      // Use Photon API for exact venue matching (like Mosques) as it performs better than Nominatim for POIs
      const [photonRes, nomRes] = await Promise.allSettled([
        fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery + ' Pakistan')}&limit=1`),
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ' Pakistan')}&addressdetails=1&limit=1&countrycodes=pk`)
      ]);

      let foundLat = null;
      let foundLng = null;
      let displayName = '';

      if (photonRes.status === 'fulfilled' && photonRes.value.ok) {
        const pData = await photonRes.value.json();
        if (pData?.features && pData.features.length > 0) {
          foundLat = pData.features[0].geometry.coordinates[1];
          foundLng = pData.features[0].geometry.coordinates[0];
          displayName = pData.features[0].properties.name || formatted;
        }
      }

      if (!foundLat && nomRes.status === 'fulfilled' && nomRes.value.ok) {
        const nData = await nomRes.value.json();
        if (Array.isArray(nData) && nData.length > 0) {
          foundLat = parseFloat(nData[0].lat);
          foundLng = parseFloat(nData[0].lon);
          displayName = nData[0].display_name.split(',')[0];
        }
      }

      if (foundLat && foundLng) {
        panMapTo(foundLat, foundLng, 17);
        // Do not reverse geocode on search to keep the exact searched name if possible, just update coords and URL
        setLat(foundLat);
        setLng(foundLng);
        setAddressText(formatted);
        const detectedCity = extractCityFromQuery(rawQuery) || city || 'Islamabad';
        setCity(detectedCity);
        setProvince(getProvinceForCity(detectedCity));
        setMapsUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatted)}`);
        
        toast.success(`📍 Pinned to: ${displayName}`, { id: 'gps-toast' });
      } else {
        const detectedCity = extractCityFromQuery(rawQuery) || city || 'Islamabad';
        const cityCoord = CITY_COORDS[detectedCity.toLowerCase()] || CITY_COORDS['islamabad'];
        panMapTo(cityCoord.lat, cityCoord.lng, 15);
        setCity(detectedCity);
        setProvince(getProvinceForCity(detectedCity));
        setAddressText(formatted);
        setMapsUrl(`https://www.google.com/maps?q=${cityCoord.lat},${cityCoord.lng}`);
        toast.success(`📍 Centered to ${detectedCity}. Pin exact location.`, { id: 'gps-toast' });
      }
    } catch (err) {
      console.warn('Geocoding search error:', err);
      toast.error('Search failed. Click map to pin location.', { id: 'gps-toast' });
    } finally {
      setGeocoding(false);
    }
  }

  function handleConfirm() {
    const finalAddress = addressText || searchQuery || 'Location';
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

  if (!isOpen) return null;

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
      {/* Outer card: Wide side-by-side split screen layout */}
      <div className="card" style={{
        width: '100%', maxWidth: '980px',
        height: 'min(580px, 92vh)',
        display: 'flex', flexDirection: 'row',
        background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '20px', overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
        position: 'relative',
      }}>

        {/* ── LEFT COLUMN: Interactive Leaflet Pin Map (Click anywhere to pin!) ── */}
        <div style={{ flex: '1.2', position: 'relative', height: '100%', background: '#1e293b' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
          
          {/* Live Location Badge Over Map */}
          <div style={{
            position: 'absolute', bottom: '16px', left: '16px', zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.92)', padding: '8px 14px', borderRadius: '12px',
            fontSize: '0.78rem', color: '#34d399', fontWeight: 700,
            border: '1px solid rgba(16, 185, 129, 0.4)', backdropFilter: 'blur(6px)',
            pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.4)', maxWidth: '85%'
          }}>
            <MapPin size={16} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              📍 Pinned: {lat.toFixed(5)}, {lng.toFixed(5)} ({city})
            </span>
          </div>

          {/* Hint Overlay */}
          <div style={{
            position: 'absolute', top: '16px', left: '16px', zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.85)', padding: '6px 12px', borderRadius: '8px',
            fontSize: '0.72rem', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'none'
          }}>
            👉 Click anywhere on map to pin new location
          </div>
        </div>

        {/* ── RIGHT COLUMN: Search, Controls & Auto-Filled Details Panel ── */}
        <div style={{
          flex: '1', display: 'flex', flexDirection: 'column',
          padding: '20px 24px', background: '#0f172a',
          borderLeft: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden'
        }}>

          {/* Clean Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexShrink: 0 }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
              <MapPin size={20} color="#ef4444" /> Pin Location Details
            </h3>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px', borderRadius: '50%' }}>
              <X size={18} />
            </button>
          </div>

          {/* Search Bar & GPS Button */}
          <div style={{ marginBottom: '16px', flexShrink: 0 }}>
            <form onSubmit={handleSearchLocation} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  className="input"
                  style={{ fontSize: '0.85rem', padding: '10px 14px', width: '100%', borderRadius: '10px' }}
                  placeholder="Search location or area..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
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
                  placeholder="e.g. Rawalpindi"
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
                placeholder="e.g. Allama Iqbal Colony, Rawalpindi"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: '4px', fontWeight: 700 }}>Google Maps Shareable URL</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="input"
                  style={{ fontSize: '0.8rem', padding: '8px 12px', flex: 1, borderRadius: '8px' }}
                  value={mapsUrl || `https://www.google.com/maps?q=${lat},${lng}`}
                  onChange={e => setMapsUrl(e.target.value)}
                  placeholder="Google Maps URL"
                />
                <a
                  href={mapsUrl || `https://www.google.com/maps?q=${lat},${lng}`}
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
