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
          width: 26px;
          height: 26px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid #ffffff;
          box-shadow: 0 4px 14px rgba(239,68,68,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
        "><div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const initialLat = lat || 33.6844;
      const initialLng = lng || 73.0479;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], { icon: redIcon, draggable: true }).addTo(map);
      markerRef.current = marker;

      // Map click -> move pin & reverse geocode
      map.on('click', (e) => {
        const clickedLat = parseFloat(e.latlng.lat.toFixed(5));
        const clickedLng = parseFloat(e.latlng.lng.toFixed(5));
        setLat(clickedLat);
        setLng(clickedLng);
        marker.setLatLng([clickedLat, clickedLng]);
        const genUrl = `https://www.google.com/maps/search/?api=1&query=${clickedLat},${clickedLng}`;
        setMapsUrl(genUrl);
        reverseGeocode(clickedLat, clickedLng);
      });

      // Marker dragend -> update position
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const draggedLat = parseFloat(pos.lat.toFixed(5));
        const draggedLng = parseFloat(pos.lng.toFixed(5));
        setLat(draggedLat);
        setLng(draggedLng);
        const genUrl = `https://www.google.com/maps/search/?api=1&query=${draggedLat},${draggedLng}`;
        setMapsUrl(genUrl);
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

  // Direct pan helper — bypasses the async state→render→effect cycle so the map moves instantly
  function panMapTo(latitude, longitude, zoom = 15) {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], zoom);
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
        const latitude  = parseFloat(pos.coords.latitude.toFixed(5));
        const longitude = parseFloat(pos.coords.longitude.toFixed(5));
        setLat(latitude);
        setLng(longitude);
        panMapTo(latitude, longitude);
        setSearchQuery('');
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

  // Reverse geocode via OpenStreetMap Nominatim
  async function reverseGeocode(latitude, longitude) {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
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

  // Search Location
  async function handleSearchLocation(e) {
    if (e) e.preventDefault();
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return;

    setGeocoding(true);
    const cleanQuery = rawQuery.replace(/\s*\([^)]*\)/g, '').trim();

    try {
      let res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ', Pakistan')}&addressdetails=1`
      );
      let results = await res.json();

      if (!results || results.length === 0) {
        res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&addressdetails=1`
        );
        results = await res.json();
      }

      if (results && results.length > 0) {
        const first = results[0];
        const latitude  = parseFloat(parseFloat(first.lat).toFixed(5));
        const longitude = parseFloat(parseFloat(first.lon).toFixed(5));

        // Immediately pan the Leaflet map — don't wait for React state→render→effect cycle
        panMapTo(latitude, longitude, 15);

        setLat(latitude);
        setLng(longitude);

        const addr = first.address || {};
        const detectedCity = addr.city || addr.town || addr.county || addr.state_district || extractCityFromQuery(rawQuery) || city;
        const detectedStreet = [addr.suburb, addr.neighbourhood, addr.road, addr.amenity, addr.hospital, addr.building].filter(Boolean).join(', ') || rawQuery;
        const detectedProvince = addr.state || province;

        setCity(detectedCity);
        setAddressText(detectedStreet || rawQuery);
        setProvince(detectedProvince);

        const generatedUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        setMapsUrl(generatedUrl);
        toast.success(`📍 Moved to: ${first.display_name.split(',')[0]}`, { id: 'gps-toast' });
      } else {
        // No geocode result — at least try to detect city from the typed query and notify user
        const detectedCity = extractCityFromQuery(rawQuery) || city;
        const cityCoord = CITY_COORDS[detectedCity.toLowerCase()];
        if (cityCoord) {
          panMapTo(cityCoord.lat, cityCoord.lng, 13);
          setLat(cityCoord.lat);
          setLng(cityCoord.lng);
        }
        setCity(detectedCity);
        setAddressText(rawQuery);
        const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawQuery)}`;
        setMapsUrl(googleSearchUrl);
        toast(`📍 "${rawQuery}" — map moved to ${detectedCity} (approximate)`, { id: 'gps-toast' });
      }
    } catch (err) {
      toast.error('Search failed. Check your connection.', { id: 'gps-toast' });
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
      <div className="card" style={{
        width: '100%', maxWidth: '600px', maxHeight: 'calc(100vh - 24px)',
        display: 'flex', flexDirection: 'column',
        background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '14px', padding: '16px 20px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
        position: 'relative'
      }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', color: '#f8fafc' }}>
            <MapPin size={18} color="#ef4444" /> Pin Exact Location on Interactive Map
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Search Bar & GPS Button */}
        <div style={{ marginBottom: '10px' }}>
          <form onSubmit={handleSearchLocation} style={{ display: 'flex', gap: '6px' }}>
            <input
              className="input"
              style={{ fontSize: '0.82rem', padding: '7px 12px', flex: 1 }}
              placeholder="Search hospital, landmark, or area in Pakistan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={geocoding} style={{ padding: '7px 14px', background: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {geocoding ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
              <span>Search</span>
            </button>
            <button type="button" onClick={handleDetectGps} className="btn btn-secondary btn-sm" disabled={loading} style={{ padding: '7px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} title="Detect Current GPS">
              {loading ? <Loader2 size={14} className="spin" /> : <Navigation size={14} />}
              <span>GPS</span>
            </button>
          </form>
        </div>

        {/* Interactive Leaflet Map Container */}
        <div style={{
          position: 'relative', width: '100%', height: '210px', minHeight: '180px', borderRadius: '10px',
          overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', marginBottom: '10px', background: '#1e293b'
        }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
          
          <div style={{
            position: 'absolute', bottom: '8px', left: '8px', zIndex: 1000, background: 'rgba(15, 23, 42, 0.92)',
            padding: '3px 10px', borderRadius: '14px', fontSize: '0.72rem', color: '#34d399', fontWeight: 600,
            border: '1px solid rgba(16, 185, 129, 0.4)', backdropFilter: 'blur(4px)'
          }}>
            📍 Click map to place red pin marker ({lat.toFixed(4)}, {lng.toFixed(4)})
          </div>
        </div>

        {/* Compact 2-Column Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ fontSize: '0.72rem', marginBottom: '2px' }}>City *</label>
            <input
              className="input"
              style={{ fontSize: '0.8rem', padding: '5px 8px' }}
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Islamabad"
            />
          </div>

          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ fontSize: '0.72rem', marginBottom: '2px' }}>Province</label>
            <input
              className="input"
              style={{ fontSize: '0.8rem', padding: '5px 8px' }}
              value={province}
              onChange={e => setProvince(e.target.value)}
              placeholder="e.g. Punjab"
            />
          </div>

          <div className="input-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
            <label className="input-label" style={{ fontSize: '0.72rem', marginBottom: '2px' }}>Street Address / Landmark</label>
            <input
              className="input"
              style={{ fontSize: '0.8rem', padding: '5px 8px' }}
              value={addressText}
              onChange={e => setAddressText(e.target.value)}
              placeholder="e.g. Sector H-12, Main Auditorium, NUST"
            />
          </div>

          <div className="input-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
            <label className="input-label" style={{ fontSize: '0.72rem', marginBottom: '2px' }}>Google Maps Link (Auto-Generated)</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                className="input"
                style={{ fontSize: '0.78rem', padding: '5px 8px', flex: 1 }}
                value={mapsUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                onChange={e => setMapsUrl(e.target.value)}
                placeholder="Google Maps URL"
              />
              <a
                href={mapsUrl || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ textDecoration: 'none', color: '#60a5fa', fontSize: '0.75rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              >
                <ExternalLink size={12} /> View Link
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '0.8rem', padding: '5px 12px' }}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleConfirm}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#10b981', color: '#fff', fontSize: '0.8rem', padding: '5px 14px' }}
          >
            <CheckCircle2 size={14} /> Confirm Location Pin
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
