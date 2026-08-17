/**
 * Seeker Dashboard — main component.
 *
 * Three tabs:
 *   Search    — find compatible donors by blood group + city
 *   New Request — submit a blood request with document upload
 *   My Requests — own request history with status timeline
 */

import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, FilePlus, ClipboardList, LogOut,
  MapPin, AlertCircle, CheckCircle2, FileText,
  Loader2, X, ExternalLink, Edit3, Phone, Building2,
  User, Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth }                          from '../../context/AuthContext';
import { useSeekerRequests, useDonorSearch } from '../../hooks/useSeekerData';
import useNotifications                     from '../../hooks/useNotifications';
import NotificationBell                     from '../../components/NotificationBell';
import LocationPickerModal                  from '../../components/LocationPickerModal';
import api                                  from '../../lib/api';
import { getViewableDocUrl, isPdfUrl }      from '../../lib/docUrl';
import '../../styles/dashboard.css';
import '../../styles/seeker.css';

const BLOOD_GROUPS   = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['routine', 'urgent', 'critical'];

const NAV_ITEMS = [
  { id: 'search',   label: 'Find Donors',  icon: Search },
  { id: 'request',  label: 'New Request',  icon: FilePlus },
  { id: 'history',  label: 'My Requests',  icon: ClipboardList },
  { id: 'edit',     label: 'Edit Profile', icon: Edit3 },
];

export default function SeekerDashboard() {
  const { user, logout }              = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const activeTab                      = searchParams.get('tab') || 'search';

  const { requests, loading: reqLoading, error: reqError, total, refetch } = useSeekerRequests();
  const navigate                      = useNavigate();
  const notifs                        = useNotifications();

  function setTab(t) {
    setSearchParams({ tab: t });
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <div className="dashboard-shell">
      {/* ── Desktop Collapsible Sidebar (72px → 250px on hover) ── */}
      <aside className="sidebar">
        <a href="/" className="sidebar-logo">
          <div className="sidebar-logo-icon">🩸</div>
          <span className="sidebar-logo-text">Blood<span>Sync</span></span>
        </a>

        <div className="sidebar-user" onClick={() => setShowProfileModal(true)} style={{ cursor: 'pointer' }}>
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">Seeker Profile</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Navigation</div>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`nav-${id}`}
              className={`sidebar-nav-link${activeTab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button id="seeker-logout" className="sidebar-nav-link" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Wrapper ── */}
      <div className="dashboard-main-wrapper">
        {/* Mobile Sticky Top Header */}
        <header className="mobile-header">
          <div className="mobile-header-logo">
            <div className="mobile-header-logo-icon">🩸</div>
            <div className="mobile-header-title">Blood<span>Sync</span></div>
          </div>

          {/* User Avatar Pill — opens profile modal */}
          <button
            className="user-avatar-pill"
            onClick={() => setShowProfileModal(true)}
            aria-label="View profile details"
          >
            {initials}
          </button>
        </header>

        {/* Main Content Area */}
        <main className="dashboard-main">
          {activeTab === 'search'  && <SearchTab />}
          {activeTab === 'request' && (
            <RequestTab
              onSubmitted={() => { refetch(); setTab('history'); }}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab
              requests={requests}
              loading={reqLoading}
              error={reqError}
              total={total}
              refetch={refetch}
              onNewRequest={() => setTab('request')}
            />
          )}
          {activeTab === 'edit' && (
            <SeekerEditProfileTab onSaved={() => setTab('search')} />
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-bottom-nav">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`mobile-nav-item${activeTab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Full Profile View Modal ── */}
      {showProfileModal && (
        <div className="profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <button
                className="profile-modal-close"
                onClick={() => setShowProfileModal(false)}
              >
                <X size={18} />
              </button>
              <div className="profile-avatar-large">{initials}</div>
              <div className="profile-modal-name">{user?.name}</div>
              <div className="profile-modal-role">Blood Seeker</div>
            </div>

            <div className="profile-modal-body">
              <div className="profile-info-row">
                <span className="profile-info-label">Email</span>
                <span className="profile-info-val">{user?.email}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Role</span>
                <span className="profile-info-val">Seeker</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Requests</span>
                <span className="profile-info-val">{total || 0} submitted</span>
              </div>
            </div>

            <div className="profile-modal-actions">
              <button
                className="btn btn-primary btn-full"
                onClick={() => {
                  setTab('request');
                  setShowProfileModal(false);
                }}
              >
                <FilePlus size={18} /> New Blood Request
              </button>
              <button
                className="btn btn-ghost btn-full"
                style={{ color: 'var(--red-400)' }}
                onClick={handleLogout}
              >
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Notification Bell */}
      <NotificationBell {...notifs} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SEARCH TAB
════════════════════════════════════════════════════════ */
function SearchTab() {
  const [bloodGroup, setBloodGroup] = useState('');
  const [city,       setCity]       = useState('');
  const { results, hospitalStock = [], summary, loading, error, search } = useDonorSearch();

  function handleSearch(e) {
    e.preventDefault();
    if (!bloodGroup) { toast.error('Select a blood group first.'); return; }
    search(bloodGroup, city.trim());
  }

  return (
    <>
      <div className="dashboard-topbar animate-fade-up">
        <div>
          <h1 className="dashboard-page-title">Find Compatible Blood & Donors</h1>
          <p className="dashboard-page-subtitle">
            Search by patient blood group — discover ready hospital stock and compatible volunteer donors.
          </p>
        </div>
      </div>

      {/* Emergency Guidance Recommendation Banner */}
      <div className="animate-fade-up" style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.25))',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: '12px',
        padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-5)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '1.4rem' }}>🚨</span>
        <div style={{ fontSize: '0.85rem', color: '#fca5a5', lineHeight: 1.4 }}>
          <strong style={{ color: '#ffffff', display: 'block', marginBottom: 2 }}>Medical Recommendation for Urgent & Critical Cases:</strong>
          For urgent trauma or critical ICU emergencies, we strongly advise contacting or admitting the patient to a hospital with <strong>Ready Stock (Freezer Inventory)</strong> for instant blood availability. If freezer stock is unavailable, post a blood request to alert local volunteer donors!
        </div>
      </div>

      {/* Search controls */}
      <form className="search-controls animate-fade-up" onSubmit={handleSearch}>
        <div className="input-group" style={{ margin: 0 }}>
          <label className="input-label" htmlFor="search-bg">
            Patient blood group <span className="required">*</span>
          </label>
          <select
            id="search-bg"
            className="input"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
          >
            <option value="">— Select —</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>

        <div className="input-group" style={{ margin: 0 }}>
          <label className="input-label" htmlFor="search-city">City (optional)</label>
          <input
            id="search-city"
            className="input"
            placeholder="Islamabad"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <button
          id="donor-search-btn"
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          Search
        </button>
      </form>

      {/* Compatibility banner — shown after first search */}
      {summary && (
        <div className="compat-banner animate-fade-up">
          <span className="compat-banner-icon">💡</span>
          <div>
            <div className="compat-banner-title">
              Compatible donor types for {bloodGroup}
              {summary.isUniversalRecipient && ' (Universal Recipient — can receive from all groups)'}
            </div>
            <div className="compat-banner-groups">
              {summary.compatibleDonors.map((g) => (
                <span key={g} className="compat-group-pill">{g}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="animate-fade-up" style={{ color: 'var(--red-400)', fontSize: '0.9rem', marginBottom: 'var(--space-4)' }}>
          <AlertCircle size={15} style={{ display: 'inline', marginRight: 6 }} />
          {error}
        </div>
      )}

      {/* Hospital Ready Stock Results */}
      {results !== null && (
        <div className="animate-fade-up" style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="#38bdf8" /> Hospitals & Blood Banks with Ready Stock ({hospitalStock.length})
          </h3>

          {hospitalStock.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {hospitalStock.map((h) => (
                <div key={h.inventoryId} className="card" style={{ padding: 'var(--space-5)', borderLeft: '4px solid #10b981', background: 'rgba(15, 23, 42, 0.85)', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>{h.hospitalName}</h4>
                      
                      {/* Clickable Exact Google Maps Location Link */}
                      <a
                        href={h.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${h.hospitalName}, ${h.address}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.82rem', color: '#60a5fa', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                        title="Click to open exact hospital location on Google Maps"
                      >
                        <MapPin size={14} color="#60a5fa" /> {h.address} <ExternalLink size={12} />
                      </a>
                    </div>

                    {/* Prominent High-Contrast Blood Group Badge */}
                    <div style={{
                      background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                      color: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '0.95rem',
                      fontWeight: 900,
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      whiteSpace: 'nowrap'
                    }}>
                      🩸 {h.bloodGroup}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#34d399' }}>🩸 {h.units} Units Available</span>
                      {h.phone && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={12} /> <a href={`tel:${h.phone}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{h.phone}</a>
                        </div>
                      )}
                    </div>
                    {h.codeRed && (
                      <span className="badge badge-red" style={{ fontSize: '0.72rem' }}>🚨 CODE RED ALERT</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: 'var(--space-4) var(--space-5)', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              🏥 No hospitals in this city currently have pre-collected freezer stock for {bloodGroup}. Request volunteer donors below!
            </div>
          )}
        </div>
      )}

      {/* Volunteer Donors Results */}
      {results !== null && (
        <div className="animate-fade-up">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🩸 Volunteer Donors Available ({results.length})
          </h3>

          {results.length > 0 ? (
            <div className="results-grid">
              {results.map((d) => (
                <div key={d.donorId} className="donor-result-card">
                  <div className="donor-result-blood">{d.bloodGroup}</div>
                  <div className="donor-result-city">
                    <MapPin size={13} /> {d.city}
                  </div>
                  {d.level && (
                    <div className="donor-result-level">
                      <span>{d.level.icon}</span>
                      <span>{d.level.label}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>No donors found</h3>
              <p>Try a broader city search or check back later.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

const PRESET_HOSPITALS = [
  { name: 'CMH Rawalpindi', city: 'Rawalpindi', address: 'The Mall Road, Saddar, Rawalpindi' },
  { name: 'Rabia Clinic & Hospital', city: 'Rawalpindi', address: 'Block 3, Satellite Town, Rawalpindi' },
  { name: 'PIMS Hospital', city: 'Islamabad', address: 'G-8/3, Sector G-8, Islamabad' },
  { name: 'Holy Family Hospital', city: 'Rawalpindi', address: 'Holy Family Road, Satellite Town, Rawalpindi' },
  { name: 'Shifa International Hospital', city: 'Islamabad', address: 'Pitras Bukhari Road, H-8/4, Islamabad' },
  { name: 'Combined Military Hospital (CMH)', city: 'Lahore', address: 'Abid Majeed Road, Cantonment, Lahore' },
  { name: 'Aga Khan University Hospital', city: 'Karachi', address: 'National Stadium Road, Karachi' },
  { name: 'Jinnah Postgraduate Medical Centre', city: 'Karachi', address: 'Rafiqui Shaheed Road, Karachi' },
];

/* ════════════════════════════════════════════════════════
   NEW REQUEST TAB
════════════════════════════════════════════════════════ */
function RequestTab({ onSubmitted }) {
  const [form, setForm] = useState({
    patientBloodGroup: '',
    hospitalName:      '',
    hospitalCity:      '',
    hospitalAddress:   '',
    latitude:          '',
    longitude:         '',
    unitsNeeded:       1,
    urgency:           'routine',
    patientName:       '',
    additionalNotes:   '',
  });
  const [files,    setFiles]    = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');
  const fileRef                 = useRef();

  const [showMapPicker, setShowMapPicker] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setApiError('');
  }

  function handleHospitalSelect(e) {
    const val = e.target.value;
    if (!val) return;
    if (val === 'custom') {
      setForm((p) => ({ ...p, hospitalName: '', hospitalCity: '', hospitalAddress: '' }));
      return;
    }
    const found = PRESET_HOSPITALS.find(h => h.name === val);
    if (found) {
      setForm((p) => ({
        ...p,
        hospitalName: found.name,
        hospitalCity: found.city,
        hospitalAddress: found.address,
      }));
    }
  }

  function detectGps() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((prev) => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }));
        setGpsStatus(`📍 GPS Pin Captured (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        setDetectingGps(false);
        toast.success('Exact GPS coordinates captured successfully for turn-by-turn navigation!');
      },
      (err) => {
        console.error('GPS error:', err);
        toast.error('Could not fetch GPS location. Please check browser permissions.');
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleFile(e) {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (files.length + selected.length > 3) {
        toast.error('You can only upload up to 3 documents.');
        return;
      }
      setFiles(prev => [...prev, ...selected].slice(0, 3));
    }
  }

  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.patientBloodGroup) { toast.error('Select patient blood group.'); return; }
    if (!form.hospitalName.trim()) { toast.error('Hospital name is required.'); return; }
    if (files.length === 0) { toast.error('Please upload at least one hospital blood request slip.'); return; }

    setSaving(true);
    setApiError('');

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
      });
      files.forEach(f => fd.append('documents', f));

      await api.post('/seekers/requests', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Request submitted! It is now pending admin review.');
      onSubmitted();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="dashboard-topbar animate-fade-up">
        <div>
          <h1 className="dashboard-page-title">Submit Blood Request</h1>
          <p className="dashboard-page-subtitle">
            Upload your hospital-issued blood request slip for verification.
          </p>
        </div>
      </div>

      <div className="profile-form-card animate-fade-up">
        {/* Info note */}
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          background: 'rgba(21,101,192,0.07)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem',
          color: 'var(--blue-300)',
          borderLeft: '2px solid var(--blue-600)',
          marginBottom: 'var(--space-5)',
        }}>
          ℹ Your request will be reviewed by an admin before donors are notified.
          Approval typically takes a few hours.
        </div>

        <form onSubmit={handleSubmit} noValidate encType="multipart/form-data">
          <div className="request-form-grid">

            {/* Patient blood group */}
            <div className="input-group">
              <label className="input-label" htmlFor="req-bg">
                Patient blood group <span className="required">*</span>
              </label>
              <select
                id="req-bg"
                name="patientBloodGroup"
                className="input"
                value={form.patientBloodGroup}
                onChange={handleChange}
              >
                <option value="">— Select —</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            {/* Units needed */}
            <div className="input-group">
              <label className="input-label" htmlFor="req-units">Units needed</label>
              <input
                id="req-units"
                name="unitsNeeded"
                type="number"
                min={1}
                max={10}
                className="input"
                value={form.unitsNeeded}
                onChange={handleChange}
              />
            </div>

            {/* Preset Hospital Selector */}
            <div className="input-group full">
              <label className="input-label" htmlFor="req-preset-hospital">
                Select Hospital / Medical Center (Quick Auto-Fill)
              </label>
              <select
                id="req-preset-hospital"
                className="input"
                onChange={handleHospitalSelect}
                defaultValue=""
              >
                <option value="">— Choose from Verified Hospitals (Optional) —</option>
                {PRESET_HOSPITALS.map((h) => (
                  <option key={h.name} value={h.name}>
                    🏥 {h.name} ({h.city})
                  </option>
                ))}
                <option value="custom">✏️ Other / Manual Hospital Entry</option>
              </select>
            </div>

            {/* Hospital name */}
            <div className="input-group">
              <label className="input-label" htmlFor="req-hospital">
                Hospital name <span className="required">*</span>
              </label>
              <input
                id="req-hospital"
                name="hospitalName"
                className="input"
                placeholder="e.g. Rabia Clinic & Hospital"
                value={form.hospitalName}
                onChange={handleChange}
              />
            </div>

            {/* Hospital city */}
            <div className="input-group">
              <label className="input-label" htmlFor="req-hcity">Hospital city</label>
              <input
                id="req-hcity"
                name="hospitalCity"
                className="input"
                placeholder="e.g. Rawalpindi"
                value={form.hospitalCity}
                onChange={handleChange}
              />
            </div>

            {/* Hospital Street Address & Area / Landmark */}
            <div className="input-group full">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                <label className="input-label" htmlFor="req-haddress" style={{ margin: 0 }}>Exact Hospital Street Address & Landmark</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowMapPicker(true)}
                  style={{ color: '#60a5fa', padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(37, 99, 235, 0.15)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)', whiteSpace: 'nowrap' }}
                >
                  <MapPin size={13} /> 📍 Pick Location on Map
                </button>
              </div>
              <input
                id="req-haddress"
                name="hospitalAddress"
                className="input"
                placeholder="e.g. Block 3, Near Commercial Market, Satellite Town"
                value={form.hospitalAddress}
                onChange={handleChange}
              />
              {gpsStatus && (
                <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {gpsStatus}
                </div>
              )}
            </div>

            {/* Patient name */}
            <div className="input-group">
              <label className="input-label" htmlFor="req-patient">Patient name</label>
              <input
                id="req-patient"
                name="patientName"
                className="input"
                placeholder="Optional"
                value={form.patientName}
                onChange={handleChange}
              />
            </div>

            {/* Urgency */}
            <div className="input-group">
              <label className="input-label">Urgency level</label>
              <div className="urgency-row">
                {URGENCY_LEVELS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    id={`urgency-${u}`}
                    className={`urgency-option${form.urgency === u ? ` selected-${u}` : ''}`}
                    onClick={() => setForm((p) => ({ ...p, urgency: u }))}
                  >
                    {u === 'routine'  && '🟢'} {u === 'urgent' && '🟡'} {u === 'critical' && '🔴'}
                    {' '}{u.charAt(0).toUpperCase() + u.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="input-group full">
              <label className="input-label" htmlFor="req-notes">Additional notes</label>
              <textarea
                id="req-notes"
                name="additionalNotes"
                className="input"
                rows={3}
                maxLength={500}
                placeholder="Any additional context for the admin reviewer..."
                value={form.additionalNotes}
                onChange={handleChange}
                style={{ resize: 'vertical', minHeight: 80 }}
              />
            </div>

            {/* Document upload */}
            <div className="input-group full">
              <label className="input-label">
                Hospital blood request slip <span className="required">*</span>
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                  {' '}(JPEG, PNG, PDF — max 5 MB)
                </span>
              </label>

              <div className="file-drop-zone" onClick={() => fileRef.current?.click()}>
                <input
                  ref={fileRef}
                  id="req-document"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFile}
                  style={{ display: 'none' }}
                />
                <div className="file-drop-icon">📄</div>
                <div className="file-drop-label">Click to choose files</div>
                <div className="file-drop-hint">JPEG · PNG · WebP · PDF — max 3 files, 5 MB each</div>
              </div>

              {files.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {files.map((f, index) => (
                    <div key={index} className="file-selected">
                      <CheckCircle2 size={16} />
                      <span>{f.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        ({(f.size / 1024).toFixed(0)} KB)
                      </span>
                      <button
                        type="button"
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {apiError && (
            <div style={{ color: 'var(--red-400)', fontSize: '0.875rem', marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <AlertCircle size={16} />{apiError}
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button
              id="request-submit"
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? <Loader2 size={16} className="spin" /> : <FilePlus size={16} />}
              Submit request
            </button>
          </div>
        </form>

        {/* Location Picker Modal */}
        <LocationPickerModal
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          initialLocation={{
            city:      form.hospitalCity,
            street:    form.hospitalAddress,
            latitude:  form.latitude ? parseFloat(form.latitude) : null,
            longitude: form.longitude ? parseFloat(form.longitude) : null,
          }}
          onSelectLocation={(loc) => {
            setForm((p) => ({
              ...p,
              hospitalCity:    loc.city || p.hospitalCity,
              hospitalAddress: loc.street || p.hospitalAddress,
              latitude:        loc.latitude ? loc.latitude.toFixed(6) : p.latitude,
              longitude:       loc.longitude ? loc.longitude.toFixed(6) : p.longitude,
            }));
            if (loc.latitude && loc.longitude) {
              setGpsStatus(`📍 Map Pin Selected (${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)})`);
            }
          }}
        />
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════
   HISTORY TAB
════════════════════════════════════════════════════════ */
function HistoryTab({ requests, loading, error, total, refetch, onNewRequest }) {
  async function handleCancel(id) {
    try {
      await api.delete(`/seekers/requests/${id}`);
      toast.success('Request cancelled.');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel request.');
    }
  }

  return (
    <>
      <div className="dashboard-topbar animate-fade-up">
        <div>
          <h1 className="dashboard-page-title">My Requests</h1>
          <p className="dashboard-page-subtitle">
            {total > 0 ? `${total} request${total !== 1 ? 's' : ''} submitted` : 'No requests yet'}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onNewRequest}>
          <FilePlus size={15} /> New request
        </button>
      </div>

      {/* Requests & Units Fulfillment Track Metrics */}
      {!loading && requests.length > 0 && (() => {
        const totalSubmitted = requests.length;
        const pendingCount = requests.filter(r => r.status === 'pending_review').length;
        const approvedCount = requests.filter(r => r.status === 'approved').length;
        const fulfilledReqs = requests.filter(r => r.status === 'fulfilled');
        const fulfilledCount = fulfilledReqs.length;
        const fulfilledUnits = fulfilledReqs.reduce((acc, curr) => acc + (curr.unitsNeeded || 1), 0);
        const cancelledCount = requests.filter(r => r.status === 'cancelled').length;

        return (
          <div className="card animate-fade-up" style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-5) var(--space-6)',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Total Submitted</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>{totalSubmitted} Requests</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Active / Pending</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f59e0b' }}>{pendingCount + approvedCount} Active</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Fulfilled Requests</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>{fulfilledCount} Completed</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Blood Units Received</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#60a5fa' }}>🩸 {fulfilledUnits} Units</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Cancelled Reqs</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f87171' }}>{cancelledCount} Cancelled</div>
            </div>
          </div>
        );
      })()}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />
          ))}
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--red-400)', fontSize: '0.9rem' }}>
          <AlertCircle size={15} style={{ display: 'inline', marginRight: 6 }} />
          {error}
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="empty-state animate-fade-up">
          <div className="empty-state-icon">📋</div>
          <h3>No requests yet</h3>
          <p style={{ marginBottom: 'var(--space-5)' }}>
            Submit a request with your hospital blood slip to get started.
          </p>
          <button className="btn btn-primary" onClick={onNewRequest}>
            <FilePlus size={16} /> Submit first request
          </button>
        </div>
      )}

      {!loading && requests.length > 0 && (() => {
        const sortedRequests = [...requests].sort((a, b) => {
          const isActiveA = ['pending_review', 'approved'].includes(a.status);
          const isActiveB = ['pending_review', 'approved'].includes(b.status);
          if (isActiveA && !isActiveB) return -1;
          if (!isActiveA && isActiveB) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        return (
          <div className="request-list animate-fade-up">
            {sortedRequests.map((r) => (
              <RequestCard key={r._id} request={r} onCancel={handleCancel} />
            ))}
          </div>
        );
      })()}
    </>
  );
}

/* ── Single request card with status timeline ── */
const STATUS_STEPS = [
  { key: 'pending_review', label: 'Submitted' },
  { key: 'approved',       label: 'Approved' },
  { key: 'fulfilled',      label: 'Fulfilled' },
];

const STATUS_LABELS = {
  pending_review: { text: 'Pending Review', badge: 'badge-amber' },
  approved:       { text: 'Approved',       badge: 'badge-green' },
  rejected:       { text: 'Rejected',       badge: 'badge-red'   },
  fulfilled:      { text: 'Fulfilled',      badge: 'badge-blue'  },
  cancelled:      { text: 'Cancelled',      badge: ''            },
};

function formatExpiry(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d - now;
  if (diffMs <= 0) return 'Expired';
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m remaining`;
  return `${mins}m remaining`;
}

function RequestCard({ request, onCancel }) {
  const meta = STATUS_LABELS[request.status] || {};
  const isRejected   = request.status === 'rejected';
  const isCancelled  = request.status === 'cancelled';
  const isCancellable = ['pending_review', 'approved'].includes(request.status);

  const enRouteCommit = (request.commitments || []).find(
    c => c.status === 'en_route' && new Date(c.expiresAt) > new Date()
  );

  // Compute timeline step states
  function stepState(stepKey) {
    if (isRejected || isCancelled) return stepKey === 'pending_review' ? 'done' : 'locked';
    const order = STATUS_STEPS.map((s) => s.key);
    const currentIdx = order.indexOf(request.status);
    const stepIdx    = order.indexOf(stepKey);
    if (stepIdx <  currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  }

  return (
    <div className="request-card-item">
      <div className="request-item-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="request-id">Request #{request._id.slice(-6)}</span>
          <span className="request-blood-pill">{request.patientBloodGroup}</span>
          {enRouteCommit && (
            <span style={{
              background: 'linear-gradient(135deg, #059669, #10b981)',
              color: '#ffffff',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
            }}>
              🚗 EN ROUTE ({formatExpiry(enRouteCommit.expiresAt)})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className={`badge ${meta.badge || ''}`}>{meta.text}</span>
          {isCancellable && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onCancel(request._id)}
              style={{ color: 'var(--red-400)', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.05)' }}
            >
              <X size={13} /> {request.status === 'approved' ? 'Close Request (No Longer Needed)' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
      <div className="request-item-header">
        <div>
          <div className="request-item-title">
            {request.patientBloodGroup} · {request.hospitalName}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Submitted {formatDate(request.createdAt)}
          </div>
        </div>
      </div>

      <div className="request-item-meta">
        <span>🏥 {request.hospitalName}{request.hospitalCity ? `, ${request.hospitalCity}` : ''}</span>
        <span>💉 {request.unitsNeeded} unit{request.unitsNeeded !== 1 ? 's' : ''}</span>
        <span>⚡ {capitalise(request.urgency)}</span>
        {request.patientName && <span>👤 {request.patientName}</span>}
      </div>

      {/* Active En-Route Donor Alert for Seeker */}
      {(() => {
        const enRouteCommit = (request.commitments || []).find(
          c => c.status === 'en_route' && new Date(c.expiresAt) > new Date()
        );
        if (!enRouteCommit) return null;

        return (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginTop: '12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#34d399',
          }}>
            <span style={{ fontSize: '1.4rem' }}>🚗</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                Good news! A donor is on their way to {request.hospitalName}!
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                Estimated travel time: ~{enRouteCommit.etaMinutes || 30} mins. Please make sure to be at the hospital counter to receive the donor.
              </div>
            </div>
          </div>
        );
      })()}

      {/* Admin note if rejected */}
      {request.adminNote && (
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          background: isRejected ? 'rgba(192,57,43,0.06)' : 'rgba(21,101,192,0.06)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem',
          color: isRejected ? 'var(--red-300)' : 'var(--blue-300)',
          marginBottom: 'var(--space-4)',
        }}>
          <strong>Admin note:</strong> {request.adminNote}
        </div>
      )}

      {/* Document links */}
      {(request.documentUrls?.length > 0 || request.documentUrl) && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
          {request.documentUrls && request.documentUrls.length > 0 ? (
            request.documentUrls.map((url, i) => (
              <a
                key={i}
                className="doc-link"
                href={getViewableDocUrl(url)}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex' }}
              >
                <FileText size={13} />
                {isPdfUrl(url) ? '📄 PDF' : '🖼 Doc'} {request.documentUrls.length > 1 ? i + 1 : ''}
                <ExternalLink size={12} />
              </a>
            ))
          ) : (
            request.documentUrl && (
              <a
                className="doc-link"
                href={getViewableDocUrl(request.documentUrl)}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex' }}
              >
                <FileText size={13} />
                {isPdfUrl(request.documentUrl) ? '📄 View PDF' : '🖼 View Document'}
                <ExternalLink size={12} />
              </a>
            )
          )}
        </div>
      )}

      {/* Status timeline — skip for cancelled/rejected */}
      {!isCancelled && (
        <div className="status-timeline">
          {STATUS_STEPS.map((step) => {
            const state = stepState(step.key);
            return (
              <div key={step.key} className={`status-step ${isRejected && step.key !== 'pending_review' ? 'failed' : state}`}>
                <div className="status-dot">
                  {state === 'done' && '✓'}
                  {state === 'active' && '●'}
                  {isRejected && step.key === 'approved' && '✕'}
                </div>
                <span className="status-label">
                  {isRejected && step.key === 'approved' ? 'Rejected' : step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Utilities ── */
function formatDate(date) {
  return new Intl.DateTimeFormat('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date));
}

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

/* ════════════════════════════════════════════════════════
   SEEKER EDIT PROFILE TAB
════════════════════════════════════════════════════════ */
function SeekerEditProfileTab({ onSaved }) {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name:  user?.name  || '',
    phone: user?.phone || '',
    city:  user?.city  || '',
  });
  const [saving,   setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setApiError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setApiError('');

    try {
      const res = await api.put('/auth/me', {
        name:  form.name.trim(),
        phone: form.phone.trim(),
        city:  form.city.trim(),
      });
      if (updateUser) {
        updateUser(res.data?.data || { name: form.name, phone: form.phone, city: form.city });
      }
      toast.success('Seeker profile updated successfully.');
      onSaved();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="dashboard-topbar animate-fade-up">
        <div>
          <h1 className="dashboard-page-title">Edit Seeker Profile</h1>
          <p className="dashboard-page-subtitle">Update your personal contact information and city location.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onSaved}>
          <X size={16} /> Cancel
        </button>
      </div>

      <div className="profile-form-card animate-fade-up" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={20} color="#38bdf8" /> Seeker Account Details
          </div>
          <div className="badge badge-blue" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
            🩸 Registered Blood Seeker
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="profile-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Name */}
            <div className="input-group">
              <label className="input-label" htmlFor="seeker-name">Full Name <span className="required">*</span></label>
              <div className="input-wrapper">
                <User className="input-icon" size={17} />
                <input
                  id="seeker-name"
                  name="name"
                  className="input has-icon"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your Full Name"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="input-group">
              <label className="input-label" htmlFor="seeker-phone">Phone Number</label>
              <div className="input-wrapper">
                <Phone className="input-icon" size={17} />
                <input
                  id="seeker-phone"
                  name="phone"
                  className="input has-icon"
                  placeholder="+92 300 0000000"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* City */}
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label" htmlFor="seeker-city">City / Region</label>
              <div className="input-wrapper">
                <MapPin className="input-icon" size={17} />
                <input
                  id="seeker-city"
                  name="city"
                  className="input has-icon"
                  placeholder="Rawalpindi / Islamabad"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {apiError && (
            <div className="flex items-center gap-2 mt-4" style={{ color: 'var(--red-400)', fontSize: '0.875rem' }}>
              <AlertCircle size={16} />{apiError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontWeight: 700 }}
            >
              {saving ? <Loader2 size={16} className="spin" /> : <Save size={18} />}
              Save Changes
            </button>
            <button type="button" className="btn btn-ghost" onClick={onSaved}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
