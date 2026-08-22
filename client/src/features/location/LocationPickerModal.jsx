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
  const [searchQuery, setSearchQuery]         = useState(safeStreet);
  const [debouncedQuery, setDebouncedQuery]   = useState(safeStreet);

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
  }, [isOpen, initialLocation]);

  // Debounce searchQuery for live Google Map embed updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
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

  // Handle typing directly in the Search Input: sync Address, City, Province, and Google Maps URL live!
  function handleSearchInputChange(e) {
    const rawVal = e.target.value;
    setSearchQuery(rawVal);

    if (!rawVal.trim()) return;

    const formatted = formatSearchAddress(rawVal);
    setAddressText(formatted);

    const detectedCity = extractCityFromQuery(rawVal) || city || 'Islamabad';
    setCity(detectedCity);

    const detectedProvince = getProvinceForCity(detectedCity);
    setProvince(detectedProvince);

    const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatted)}`;
    setMapsUrl(googleSearchUrl);
  }

  // Handle typing directly in Street Address field: sync Search query, City, Province, and Google Maps URL live!
  function handleAddressInputChange(e) {
    const rawVal = e.target.value;
    setAddressText(rawVal);

    if (!rawVal.trim()) return;

    const formatted = formatSearchAddress(rawVal);
    setSearchQuery(formatted);

    const detectedCity = extractCityFromQuery(rawVal) || city || 'Islamabad';
    setCity(detectedCity);

    const detectedProvince = getProvinceForCity(detectedCity);
    setProvince(detectedProvince);

    const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatted)}`;
    setMapsUrl(googleSearchUrl);
  }

  // Handle typing/pasting directly in Google Maps Shareable URL field: auto-extract venue/plus-code, city, and province!
  function handleMapsUrlInputChange(e) {
    const rawVal = e.target.value;
    setMapsUrl(rawVal);

    if (!rawVal.trim()) return;

    if (rawVal.includes('google.com/maps') || rawVal.includes('maps.app.goo.gl')) {
      const placeMatch = rawVal.match(/\/place\/([^/@?]+)/);
      if (placeMatch && placeMatch[1]) {
        const decoded = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        const formatted = formatSearchAddress(decoded);
        setAddressText(formatted);
        setSearchQuery(formatted);
        const detectedCity = extractCityFromQuery(decoded) || city || 'Islamabad';
        setCity(detectedCity);
        setProvince(getProvinceForCity(detectedCity));
        return;
      }
    }

    const plusMatch = rawVal.match(/([A-Z0-9]{4}\+[A-Z0-9]{2,3})(?:,\s*(.*))?/i);
    if (plusMatch) {
      const rest = plusMatch[2] || '';
      const formatted = rest ? `${plusMatch[1]}, ${rest}` : plusMatch[1];
      setAddressText(formatted);
      setSearchQuery(formatted);
      const detectedCity = extractCityFromQuery(rest) || city || 'Islamabad';
      setCity(detectedCity);
      setProvince(getProvinceForCity(detectedCity));
    }
  }

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

        const gpsQuery = `${latitude},${longitude}`;
        setSearchQuery(gpsQuery);
        setDebouncedQuery(gpsQuery);
        setAddressText(`GPS Location (${latitude}, ${longitude})`);

        const genUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        setMapsUrl(genUrl);

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

  // Handle Search submit
  function handleSearchSubmit(e) {
    if (e) e.preventDefault();
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return;

    const formatted = formatSearchAddress(rawQuery);
    setAddressText(formatted);

    const detectedCity = extractCityFromQuery(rawQuery) || city || 'Islamabad';
    setCity(detectedCity);

    const detectedProvince = getProvinceForCity(detectedCity);
    setProvince(detectedProvince);

    const googleSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatted)}`;
    setMapsUrl(googleSearchUrl);

    toast.success(`📍 Map centered to exact query: ${formatted}`, { id: 'gps-toast' });
  }

  function handleConfirm() {
    const finalAddress = addressText || searchQuery || 'Hospital Location';
    const finalUrl = mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeEmbedQuery)}`;
    
    onSelectLocation({
      latitude:  lat,
      longitude: lng,
      street:    finalAddress,
      address:   finalAddress,
      city:      city || 'Islamabad',
      province:  province || 'Islamabad Capital Territory',
      mapsUrl:   finalUrl,
    });
    toast.success('Location confirmed!', { id: 'gps-toast' });
    onClose();
  }

  // Active query for live Google Maps Embed iframe
  const activeEmbedQuery = formatSearchAddress(debouncedQuery.trim() || searchQuery.trim() || addressText || (lat && lng ? `${lat},${lng}` : `${city}, Pakistan`));
  const activeMapsUrl    = mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeEmbedQuery)}`;

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

        {/* ── LEFT COLUMN: 100% Real Google Maps View ── */}
        <div style={{ flex: '1.2', position: 'relative', height: '100%', background: '#1e293b', display: 'flex', flexDirection: 'column' }}>
          
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
              📍 Google Map View: {activeEmbedQuery}
            </span>
          </div>

        </div>

        {/* ── RIGHT COLUMN: Search, Controls & Auto-Filled Details Panel ── */}
        <div style={{
          flex: '1', display: 'flex', flexDirection: 'column',
          padding: '20px 24px', background: '#0f172a',
          borderLeft: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden'
        }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                <MapPin size={20} color="#ef4444" /> Location Details
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>See location on Google Map & update details live</p>
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px', borderRadius: '50%' }}>
              <X size={18} />
            </button>
          </div>

          {/* Search Bar & GPS Button */}
          <div style={{ marginBottom: '16px', flexShrink: 0 }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  className="input"
                  style={{ fontSize: '0.85rem', padding: '10px 14px', width: '100%', borderRadius: '10px' }}
                  placeholder="Type address, hospital, landmark (e.g. Allama iqbal colony street 39, rawalpindi)..."
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ padding: '10px 16px', background: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, fontWeight: 700, borderRadius: '10px' }}
              >
                <Search size={16} />
                <span>Sync</span>
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
                onChange={handleAddressInputChange}
                placeholder="e.g. Allama Iqbal Colony Street 39, Rawalpindi"
              />
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label className="input-label" style={{ fontSize: '0.75rem', marginBottom: '4px', fontWeight: 700 }}>Google Maps Shareable URL</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="input"
                  style={{ fontSize: '0.8rem', padding: '8px 12px', flex: 1, borderRadius: '8px' }}
                  value={activeMapsUrl}
                  onChange={handleMapsUrlInputChange}
                  placeholder="Google Maps URL"
                />
                <a
                  href={activeMapsUrl}
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
              <CheckCircle2 size={18} /> Confirm Location Details
            </button>
          </div>

        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
