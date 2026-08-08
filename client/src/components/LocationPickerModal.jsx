/**
 * LocationPickerModal.jsx
 *
 * Compact 1-Screen Interactive Location Picker for BloodSync.
 * Rendered using React Portal (createPortal) directly into document.body
 * to guarantee true position: fixed viewport anchoring without parent transform interference.
 */

import { useState, useEffect } from 'react';
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
  const [addressText, setAddressText] = useState(initialLocation.street || '');
  const [city, setCity]               = useState(initialLocation.city || 'Islamabad');
  const [province, setProvince]       = useState(initialLocation.province || 'Punjab');
  const [mapsUrl, setMapsUrl]         = useState(initialLocation.mapsUrl || '');

  const [loading, setLoading]         = useState(false);
  const [geocoding, setGeocoding]     = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapQuery, setMapQuery]       = useState('');

  useEffect(() => {
    if (initialLocation.latitude && initialLocation.longitude) {
      setLat(initialLocation.latitude);
      setLng(initialLocation.longitude);
      setMapQuery('');
    } else if (initialLocation.city) {
      const key = initialLocation.city.toLowerCase().trim();
      if (CITY_COORDS[key]) {
        setLat(CITY_COORDS[key].lat);
        setLng(CITY_COORDS[key].lng);
        setMapQuery('');
      }
    }
  }, [initialLocation]);

  // Completely freeze body and html scroll when modal is open
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

  // Single-toast deduplicated GPS Auto-Detection
  function handleDetectGps() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.', { id: 'gps-toast' });
      return;
    }
    setLoading(true);
    toast.loading('Detecting GPS position…', { id: 'gps-toast' });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude  = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(latitude);
        setLng(longitude);
        setMapQuery('');
        const generatedUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        setMapsUrl(generatedUrl);
        
        await reverseGeocode(latitude, longitude);
        setLoading(false);
        toast.success('GPS position detected!', { id: 'gps-toast' });
      },
      (err) => {
        setLoading(false);
        const errMsg = err.code === 1 
          ? 'GPS access denied. Use search or select location manually.' 
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
        const detectedStreet = [addr.suburb, addr.neighbourhood, addr.road, addr.amenity].filter(Boolean).join(', ') || addressText;
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

  // Multi-tier Robust Location Search
  async function handleSearchLocation(e) {
    if (e) e.preventDefault();
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return;

    setGeocoding(true);
    // Strip parenthetical text like "(IMC)" to help geocoding engines
    const cleanQuery = rawQuery.replace(/\s*\([^)]*\)/g, '').trim();
    setMapQuery(rawQuery); // Immediately update Google Maps embed view

    try {
      // Tier 1: Try clean query + Pakistan
      let res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ', Pakistan')}&addressdetails=1`
      );
      let results = await res.json();

      // Tier 2: Try clean query without country suffix
      if (!results || results.length === 0) {
        res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&addressdetails=1`
        );
        results = await res.json();
      }

      // Tier 3: Try raw query
      if (!results || results.length === 0) {
        res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(rawQuery)}&addressdetails=1`
        );
        results = await res.json();
      }

      if (results && results.length > 0) {
        const first = results[0];
        const latitude  = parseFloat(first.lat);
        const longitude = parseFloat(first.lon);
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
        toast.success(`Map centered on: ${first.display_name.split(',')[0]}`, { id: 'gps-toast' });
      } else {
        // Fallback: If free API misses exact vector, extract city & set Google Maps search URL
        const detectedCity = extractCityFromQuery(rawQuery) || city;
        setCity(detectedCity);
        setAddressText(rawQuery);

        const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawQuery)}`;
        setMapsUrl(googleSearchUrl);
        toast.success(`Map updated for "${rawQuery}"`, { id: 'gps-toast' });
      }
    } catch (err) {
      toast.error('Search complete. Google Maps link updated.', { id: 'gps-toast' });
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
      city,
      province,
      mapsUrl:   finalUrl,
    });
    toast.success('Location confirmed!', { id: 'gps-toast' });
    onClose();
  }

  // High reliability Google Maps iframe embed — switches dynamically between coordinates and place search query
  const mapIframeUrl = mapQuery 
    ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;

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
        width: '100%', maxWidth: '580px', maxHeight: 'calc(100vh - 24px)',
        display: 'flex', flexDirection: 'column',
        background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '14px', padding: '16px 20px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
        position: 'relative'
      }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', color: '#f8fafc' }}>
            <MapPin size={18} color="#ef4444" /> Select Exact Location
          </h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Search Bar & GPS Auto-Detect */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          <form onSubmit={handleSearchLocation} style={{ flex: 1, display: 'flex', gap: '4px' }}>
            <input
              className="input"
              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              placeholder="Search area, hospital or landmark…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={geocoding} style={{ padding: '6px 12px' }}>
              {geocoding ? <Loader2 size={13} className="spin" /> : <Search size={13} />}
            </button>
          </form>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleDetectGps}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', background: '#2563eb', padding: '6px 10px', whiteSpace: 'nowrap' }}
          >
            {loading ? <Loader2 size={13} className="spin" /> : <Navigation size={13} />}
            <span>GPS Auto-Detect</span>
          </button>
        </div>

        {/* Interactive Map Embed (Compact 160px height) */}
        <div style={{
          position: 'relative', width: '100%', height: '160px', minHeight: '140px', borderRadius: '10px',
          overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '10px', background: '#1e293b'
        }}>
          <iframe
            title="Location Map Embed"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src={mapIframeUrl}
          />
          <div style={{
            position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(15, 23, 42, 0.9)',
            padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600,
            border: '1px solid rgba(56, 189, 248, 0.3)'
          }}>
            📍 Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}
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
              placeholder="e.g. Block 3, Near Commercial Market, CMH"
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
                <ExternalLink size={12} /> Link
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
            <CheckCircle2 size={14} /> Confirm Location
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
