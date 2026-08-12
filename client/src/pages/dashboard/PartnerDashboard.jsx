/**
 * PartnerDashboard — Dedicated dashboard for Partner Organisations (PRCS, Edhi, Chhipa, University Societies).
 *
 * Tabs:
 *   1. Overview           — Stats (active drives, donors mobilized, requests facilitated, pending assisted requests)
 *   2. Drives & Camps     — Create/manage blood donation camps (title, date/time, location pin, target blood groups, turnout, RSVPs)
 *   3. Assisted Requests  — Create/manage blood requests on behalf of elderly/rural seekers without smartphones
 *   4. History Log        — Completed drives + facilitated request outcomes
 *   5. Profile            — Org details, contact, SECP / Charity registration proof number, verification documents
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Building2, Calendar, Users, HeartHandshake, ClipboardList, Clock, MapPin, Phone, Mail,
  Plus, CheckCircle2, AlertCircle, FileText, Upload, LogOut, Loader2, ExternalLink, X, ShieldCheck, ChevronRight, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import PhoneInput from '../../components/PhoneInput';
import LocationPickerModal from '../../components/LocationPickerModal';
import api from '../../lib/api';
import '../../styles/dashboard.css';
import '../../styles/hospital.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_LEVELS = ['routine', 'urgent', 'critical'];

export default function PartnerDashboard({ profile, hooks, onLogout }) {
  const { org } = profile;
  const { saveProfile } = hooks;

  const [activeTab, setActiveTab] = useState('overview');

  // Partner data state
  const [stats, setStats] = useState({
    activeDrives: 0,
    completedDrives: 0,
    donorsMobilized: 0,
    requestsFacilitated: 0,
    pendingAssistedRequests: 0,
  });
  const [drives, setDrives] = useState([]);
  const [assistedRequests, setAssistedRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drive creation modal state
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveForm, setDriveForm] = useState({
    title: '', description: '', date: '', startTime: '09:00 AM', endTime: '05:00 PM',
    address: '', city: org?.address?.city || '', mapsUrl: '', latitude: null, longitude: null,
    targetBloodGroups: [], expectedTurnout: 50,
  });
  const [savingDrive, setSavingDrive] = useState(false);
  const [showDriveMapPicker, setShowDriveMapPicker] = useState(false);

  // Assisted request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showRequestMapPicker, setShowRequestMapPicker] = useState(false);
  const [requestForm, setRequestForm] = useState({
    bloodGroup: 'O+', unitsRequired: 1, urgency: 'urgent',
    hospitalName: '', hospitalCity: org?.address?.city || '', hospitalAddress: '',
    patientName: '', additionalNotes: '', seekerPhone: '',
    latitude: null, longitude: null, mapsUrl: '',
  });
  const [requestFiles, setRequestFiles] = useState([]);
  const [savingRequest, setSavingRequest] = useState(false);
  const fileRef = useRef(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: org?.name || '',
    city: org?.address?.city || '',
    street: org?.address?.street || '',
    province: org?.address?.province || '',
    mapsUrl: org?.address?.mapsUrl || '',
    phone: org?.phone || '',
    email: org?.email || '',
    secpRegistrationNo: org?.secpRegistrationNo || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [showProfileMapPicker, setShowProfileMapPicker] = useState(false);

  // Selected drive RSVP drawer state
  const [selectedDriveRSVPs, setSelectedDriveRSVPs] = useState(null);

  const fetchPartnerData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, drivesRes, reqsRes] = await Promise.all([
        api.get('/partners/stats').catch(() => ({ data: { data: {} } })),
        api.get('/partners/drives').catch(() => ({ data: { data: [] } })),
        api.get('/partners/assisted-requests').catch(() => ({ data: { data: [] } })),
      ]);
      setStats(statsRes.data?.data || {});
      setDrives(drivesRes.data?.data || []);
      setAssistedRequests(reqsRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load partner data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartnerData();
  }, [fetchPartnerData]);

  // Create Drive Handler
  async function handleCreateDrive(e) {
    e.preventDefault();
    if (!driveForm.title || !driveForm.date || !driveForm.city) {
      toast.error('Camp title, date, and city are required.');
      return;
    }
    setSavingDrive(true);
    try {
      await api.post('/partners/drives', driveForm);
      toast.success('Donation camp created successfully!');
      setShowDriveModal(false);
      setDriveForm({
        title: '', description: '', date: '', startTime: '09:00 AM', endTime: '05:00 PM',
        address: '', city: org?.address?.city || '', mapsUrl: '', latitude: null, longitude: null,
        targetBloodGroups: [], expectedTurnout: 50,
      });
      fetchPartnerData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create camp.');
    } finally {
      setSavingDrive(false);
    }
  }

  // Create Assisted Request Handler
  async function handleCreateRequest(e) {
    e.preventDefault();
    if (!requestForm.hospitalName || !requestForm.hospitalCity || !requestForm.bloodGroup) {
      toast.error('Hospital name, city, and blood group are required.');
      return;
    }
    if (requestFiles.length === 0) {
      toast.error('Please attach at least one hospital blood request slip.');
      return;
    }
    setSavingRequest(true);
    try {
      const fd = new FormData();
      Object.entries(requestForm).forEach(([k, v]) => fd.append(k, v));
      requestFiles.forEach(f => fd.append('documents', f));

      await api.post('/partners/assisted-requests', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Assisted blood request submitted for admin review!');
      setShowRequestModal(false);
      setRequestForm({
        bloodGroup: 'O+', unitsRequired: 1, urgency: 'urgent',
        hospitalName: '', hospitalCity: org?.address?.city || '', hospitalAddress: '',
        patientName: '', additionalNotes: '', seekerPhone: '',
      });
      setRequestFiles([]);
      fetchPartnerData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit assisted request.');
    } finally {
      setSavingRequest(false);
    }
  }

  // Profile Save Handler
  async function handleSaveProfile(e) {
    if (e) e.preventDefault();
    setSavingProfile(true);
    try {
      await saveProfile(profileForm, true);
      toast.success('Partner organisation profile updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Profile update failed.');
    } finally {
      setSavingProfile(false);
    }
  }

  const toggleBloodGroup = (bg) => {
    setDriveForm(p => {
      const current = p.targetBloodGroups;
      const updated = current.includes(bg) ? current.filter(g => g !== bg) : [...current, bg];
      return { ...p, targetBloodGroups: updated };
    });
  };

  const initials = org?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'P';

  const isApproved = org?.status === 'approved';

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'drives', label: 'Drives & Camps', icon: Calendar },
    { id: 'assisted', label: 'Assisted Requests', icon: HeartHandshake },
    { id: 'history', label: 'History Log', icon: ClipboardList },
    { id: 'profile', label: 'Profile & Verification', icon: ShieldCheck },
  ];

  return (
    <div className="dashboard-shell">
      {/* ── Desktop Collapsible Sidebar (72px → 250px on hover) ── */}
      <aside className="sidebar">
        <a href="/" className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ background: 'linear-gradient(135deg, var(--blue-600), var(--blue-800))' }}>
            <Building2 size={18} color="#fff" />
          </div>
          <span className="sidebar-logo-text">Blood<span>Sync</span></span>
        </a>

        <div className="sidebar-user" onClick={() => setActiveTab('profile')} style={{ cursor: 'pointer' }}>
          <div className="sidebar-user-card">
            <div className="sidebar-avatar" style={{ background: 'linear-gradient(135deg, var(--blue-600), var(--blue-900))' }}>{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{org?.name}</div>
              <div className="sidebar-user-role">Partner Organisation</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Navigation</div>
          {TABS.map(({ id, label, icon: Icon }) => {
            const isLocked = !isApproved && id !== 'overview' && id !== 'profile';
            return (
              <button
                key={id}
                className={`sidebar-nav-link${activeTab === id ? ' active' : ''}`}
                style={{
                  ...(activeTab === id ? { background: 'rgba(21, 101, 192, 0.15)', color: 'var(--blue-300)' } : {}),
                  ...(isLocked ? { opacity: 0.65 } : {})
                }}
                onClick={() => {
                  if (isLocked) {
                    toast.error('Feature locked until organization account is verified by Admin.', { id: 'lock-toast' });
                  }
                  setActiveTab(id);
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} />
                  {isLocked && (
                    <div style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', border: '1px solid #0f172a', pointerEvents: 'none' }} />
                  )}
                </div>
                <span>
                  <span style={{ flex: 1 }}>{label}</span>
                  {isLocked && <Lock size={13} color="#f59e0b" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-nav-link" onClick={onLogout} style={{ color: 'var(--red-400)' }}>
            <LogOut size={20} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Wrapper (Adjusts layout smoothly on hover expansion) ── */}
      <div className="dashboard-main-wrapper">
        {/* Mobile Sticky Top Header */}
        <header className="mobile-header">
          <div className="mobile-header-logo">
            <div className="mobile-header-logo-icon" style={{ background: 'linear-gradient(135deg, var(--blue-600), var(--blue-800))' }}>
              <Building2 size={16} color="#fff" />
            </div>
            <div className="mobile-header-title">{org?.name || 'Partner'}</div>
          </div>

          <button
            className="user-avatar-pill"
            style={{ background: 'linear-gradient(135deg, var(--blue-600), var(--blue-900))' }}
            onClick={() => setActiveTab('profile')}
            aria-label="View partner profile"
          >
            {initials}
          </button>
        </header>

        {/* Main Content Area */}
        <main className="dashboard-main">
        <header className="hospital-header" style={{ marginBottom: 24 }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {activeTab === 'overview' && '🤝 Partner Overview & Impact'}
              {activeTab === 'drives' && '🎪 Blood Donation Camps & Drives'}
              {activeTab === 'assisted' && '🆘 Assisted Patient Blood Requests'}
              {activeTab === 'history' && '📜 Activity & Fulfillment History'}
              {activeTab === 'profile' && '⚙️ Partner Profile & Verification'}
            </h1>
            <p className="page-sub" style={{ margin: 0 }}>
              Mobilizing blood donors, hosting donation camps, and assisting vulnerable patients across Pakistan.
            </p>
          </div>
        </header>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            {!isApproved && (
              <div className="pending-banner" style={{ marginBottom: 24, border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.1)', padding: '14px 18px', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <AlertCircle size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#f59e0b', fontSize: '0.95rem', fontWeight: 700 }}>Account Awaiting Admin Verification</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                    Your partner organization registration is currently under review by System Administrators. Campaign creation and assisted patient requests will unlock immediately once approved.
                  </p>
                </div>
              </div>
            )}

            <div className="hospital-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
              <div className="hospital-stat-card">
                <div className="stat-label">Active Drives</div>
                <div className="stat-value" style={{ color: '#60a5fa' }}>{stats.activeDrives || 0}</div>
                <div className="stat-sub">upcoming camps</div>
              </div>
              <div className="hospital-stat-card">
                <div className="stat-label">Donors Mobilized</div>
                <div className="stat-value" style={{ color: '#34d399' }}>{stats.donorsMobilized || 0}</div>
                <div className="stat-sub">attendees RSVP'd</div>
              </div>
              <div className="hospital-stat-card">
                <div className="stat-label">Requests Facilitated</div>
                <div className="stat-value" style={{ color: '#f43f5e' }}>{stats.requestsFacilitated || 0}</div>
                <div className="stat-sub">patient requests</div>
              </div>
              <div className="hospital-stat-card">
                <div className="stat-label">Pending Assisted</div>
                <div className="stat-value" style={{ color: '#fbbf24' }}>{stats.pendingAssistedRequests || 0}</div>
                <div className="stat-sub">under admin review</div>
              </div>
            </div>

            {/* Quick Action Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 14 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={20} /> Organize Blood Camp
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  Host a blood donation drive at a university, college, community center, or office. Donors can RSVP directly from their mobile app.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  if (!isApproved) {
                    toast.error('Feature locked until organization account is approved by Admin.');
                    return;
                  }
                  setActiveTab('drives');
                  setShowDriveModal(true);
                }}>
                  <Plus size={16} /> Create Donation Camp
                </button>
              </div>

              <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 14 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HeartHandshake size={20} /> Assist Vulnerable Patient
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  Submit an urgent blood request on behalf of an elderly, rural, or non-smartphone user. Admin reviews and dispatches nearby donors.
                </p>
                <button className="btn btn-primary btn-sm" style={{ background: '#f43f5e', borderColor: '#f43f5e' }} onClick={() => {
                  if (!isApproved) {
                    toast.error('Feature locked until organization account is approved by Admin.');
                    return;
                  }
                  setActiveTab('assisted');
                  setShowRequestModal(true);
                }}>
                  <Plus size={16} /> Submit Assisted Request
                </button>
              </div>
            </div>
          </div>
        )}

        {!isApproved && activeTab !== 'overview' && activeTab !== 'profile' ? (
          <div 
            className="card animate-fade-up" 
            style={{ 
              padding: 'clamp(24px, 5vw, 48px) clamp(16px, 4vw, 36px)', 
              textAlign: 'center', 
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.6))', 
              border: '1px solid rgba(245, 158, 11, 0.3)', 
              marginTop: 16, 
              borderRadius: 20,
              maxWidth: 620,
              margin: '20px auto 0',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'grid', placeItems: 'center', marginBottom: 20, boxShadow: '0 0 25px rgba(245, 158, 11, 0.2)' }}>
              <Lock size={28} color="#f59e0b" />
            </div>
            <h3 style={{ fontSize: 'clamp(1.1rem, 3.5vw, 1.35rem)', fontWeight: 800, color: '#f8fafc', marginBottom: 10 }}>
              Feature Locked — Awaiting Admin Verification
            </h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 20px', fontSize: '0.88rem', lineHeight: 1.6 }}>
              Donation Camp Creation, Assisted Patient Requests, and Activity Logs will automatically unlock once an Administrator verifies and approves your partner organization registration.
            </p>
            <div className="badge badge-amber" style={{ fontSize: '0.82rem', padding: '8px 18px', borderRadius: 20, letterSpacing: '0.04em', marginBottom: 20 }}>
              STATUS: {org?.status === 'pending' ? '⏳ UNDER ADMIN REVIEW' : '❌ REGISTRATION REJECTED'}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('profile')}>
              View / Complete Registration Profile
            </button>
          </div>
        ) : (
          <>

        {/* TAB 2: DRIVES & CAMPS */}
        {activeTab === 'drives' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Active & Upcoming Donation Camps</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Organize camps and track donor RSVPs in real time.</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowDriveModal(true)}>
                <Plus size={16} /> Create New Camp
              </button>
            </div>

            {drives.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <Calendar size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                <h4>No Donation Camps Scheduled Yet</h4>
                <p style={{ fontSize: '0.85rem' }}>Click "Create New Camp" above to schedule a blood donation drive for your organization.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {drives.map(drive => (
                  <div key={drive._id} className="card" style={{ padding: 20, borderRadius: 14, border: '1px solid var(--surface-border)', background: 'var(--surface-card)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <span className="badge badge-blue">{drive.status.toUpperCase()}</span>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={14} /> <strong>{drive.rsvps?.length || 0}</strong> / {drive.expectedTurnout} RSVPs
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#f8fafc' }}>{drive.title}</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>{drive.description || 'Blood donation drive organized by ' + org.name}</p>

                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={14} color="#60a5fa" /> {new Date(drive.date).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} ({drive.startTime} - {drive.endTime})
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={14} color="#f43f5e" /> {drive.location?.address ? drive.location.address + ', ' : ''}{drive.location?.city}
                      </div>
                    </div>

                    {drive.rsvps && drive.rsvps.length > 0 && (
                      <button className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: '0.8rem', color: '#60a5fa' }} onClick={() => setSelectedDriveRSVPs(drive)}>
                        👥 View {drive.rsvps.length} RSVP Donor List
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ASSISTED REQUESTS */}
        {activeTab === 'assisted' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>Assisted Patient Blood Requests</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Requests submitted on behalf of patients unable to use the mobile app.</p>
              </div>
              <button className="btn btn-primary btn-sm" style={{ background: '#f43f5e', borderColor: '#f43f5e' }} onClick={() => setShowRequestModal(true)}>
                <Plus size={16} /> New Assisted Request
              </button>
            </div>

            {assistedRequests.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <HeartHandshake size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                <h4>No Assisted Requests Created Yet</h4>
                <p style={{ fontSize: '0.85rem' }}>Submit a blood request for a patient in need by clicking the button above.</p>
              </div>
            ) : (
              <div className="inventory-table-wrap">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Patient / Hospital</th>
                      <th>Blood Group</th>
                      <th>Units</th>
                      <th>Urgency</th>
                      <th>Status</th>
                      <th>Submitted Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assistedRequests.map(req => (
                      <tr key={req._id}>
                        <td>
                          <strong>{req.patientName || 'Assisted Patient'}</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{req.hospitalName}, {req.hospitalCity}</div>
                        </td>
                        <td><span className="blood-group-pill">{req.bloodGroup || req.patientBloodGroup}</span></td>
                        <td><strong>{req.unitsRequired || req.unitsNeeded}</strong></td>
                        <td>
                          <span className={`badge ${req.urgency === 'critical' ? 'badge-red' : req.urgency === 'urgent' ? 'badge-amber' : 'badge-blue'}`}>
                            {req.urgency ? req.urgency.toUpperCase() : 'URGENT'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${req.status === 'fulfilled' ? 'badge-green' : req.status === 'approved' ? 'badge-blue' : req.status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>
                            {req.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {new Date(req.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: HISTORY LOG */}
        {activeTab === 'history' && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Partner Activity & Facilitation History</h3>
            <div className="inventory-table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Activity Type</th>
                    <th>Title / Details</th>
                    <th>Outcome / Impact</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {drives.filter(d => d.status === 'completed').map(d => (
                    <tr key={d._id}>
                      <td><span className="badge badge-blue">🎪 COMPLETED CAMP</span></td>
                      <td><strong>{d.title}</strong> ({d.location?.city})</td>
                      <td>{d.rsvps?.length || 0} donors mobilized</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{new Date(d.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {assistedRequests.map(r => (
                    <tr key={r._id}>
                      <td><span className="badge badge-amber">🆘 ASSISTED REQUEST</span></td>
                      <td>Patient: <strong>{r.patientName || 'Assisted'}</strong> ({r.bloodGroup || r.patientBloodGroup}) at {r.hospitalName}</td>
                      <td>
                        <span className={`badge ${r.status === 'fulfilled' ? 'badge-green' : 'badge-blue'}`}>
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE & VERIFICATION */}
        {activeTab === 'profile' && (
          <div className="hospital-profile-card">
            <h3 style={{ marginBottom: 16 }}>Partner Profile & Official Verification</h3>

            <div className="card" style={{ padding: '16px 20px', marginBottom: 20, background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 12 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} /> Official Verification Proof
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Enter your SECP registration number, Charity Commission license, or NGO registration proof to facilitate swift admin verification.
              </div>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="profile-form-grid">
                <div className="input-group">
                  <label className="input-label">Organisation Name</label>
                  <input className="input" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} />
                </div>

                <div className="input-group">
                  <label className="input-label">SECP / Charity License Registration No.</label>
                  <input className="input" placeholder="e.g. SECP-NGO-2024-9841" value={profileForm.secpRegistrationNo} onChange={e => setProfileForm(p => ({ ...p, secpRegistrationNo: e.target.value }))} />
                </div>

                <div className="input-group">
                  <label className="input-label">City</label>
                  <input className="input" value={profileForm.city} onChange={e => setProfileForm(p => ({ ...p, city: e.target.value }))} />
                </div>

                <div className="input-group">
                  <label className="input-label">Street / Area</label>
                  <input className="input" value={profileForm.street} onChange={e => setProfileForm(p => ({ ...p, street: e.target.value }))} />
                </div>

                <div className="input-group">
                  <label className="input-label">Phone</label>
                  <PhoneInput value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                </div>

                <div className="input-group">
                  <label className="input-label">Official Email</label>
                  <input className="input" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: 20 }} disabled={savingProfile}>
                {savingProfile ? <Loader2 size={16} className="spin" /> : 'Save Partner Profile'}
              </button>
            </form>
          </div>
        )}
        </>
        )}
        </main>
      </div>

      {/* CREATE DRIVE MODAL */}
      {showDriveModal && (
        <div className="code-red-overlay" onClick={() => setShowDriveModal(false)}>
          <div className="code-red-modal" style={{ maxWidth: 620, width: '100%', padding: '18px 24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1.08rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                🎪 Create Blood Donation Camp
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDriveModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateDrive}>
              <div className="profile-form-grid" style={{ marginBottom: 10 }}>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Camp Title *</label>
                  <input className="input" placeholder="e.g. NUST Annual Blood Drive" value={driveForm.title} onChange={e => setDriveForm(p => ({ ...p, title: e.target.value }))} required />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Camp Date *</label>
                  <input type="date" className="input" value={driveForm.date} onChange={e => setDriveForm(p => ({ ...p, date: e.target.value }))} required />
                </div>
              </div>

              <div className="profile-form-grid" style={{ marginBottom: 10 }}>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>City *</label>
                  <input className="input" value={driveForm.city} onChange={e => setDriveForm(p => ({ ...p, city: e.target.value }))} required />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Target Units Goal 🎯</label>
                  <input type="number" min="1" className="input" placeholder="e.g. 50" value={driveForm.expectedTurnout} onChange={e => setDriveForm(p => ({ ...p, expectedTurnout: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>

              <div className="profile-form-grid" style={{ marginBottom: 10 }}>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Start Time</label>
                  <input className="input" placeholder="e.g. 09:00 AM" value={driveForm.startTime} onChange={e => setDriveForm(p => ({ ...p, startTime: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>End Time</label>
                  <input className="input" placeholder="e.g. 05:00 PM" value={driveForm.endTime} onChange={e => setDriveForm(p => ({ ...p, endTime: e.target.value }))} />
                </div>
              </div>

              <div className="profile-form-grid" style={{ marginBottom: 10 }}>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Camp Location Address *</label>
                  <input className="input" placeholder="e.g. Main Auditorium, Sector H-12" value={driveForm.address} onChange={e => setDriveForm(p => ({ ...p, address: e.target.value }))} required />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Exact Map Pin 📍</label>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ width: '100%', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: driveForm.latitude ? 'rgba(16, 185, 129, 0.15)' : undefined, borderColor: driveForm.latitude ? '#10b981' : undefined, color: driveForm.latitude ? '#34d399' : undefined }} onClick={() => setShowDriveMapPicker(true)}>
                    <MapPin size={15} /> {driveForm.latitude ? '📍 Pinned' : '📍 Pin Location'}
                  </button>
                </div>
              </div>

              <div className="profile-form-grid" style={{ marginBottom: 12 }}>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Google Maps Link / URL</label>
                  <input className="input" placeholder="https://maps.google.com/?q=..." value={driveForm.mapsUrl} onChange={e => setDriveForm(p => ({ ...p, mapsUrl: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Description / Notes</label>
                  <input className="input" placeholder="e.g. Refreshments provided" value={driveForm.description} onChange={e => setDriveForm(p => ({ ...p, description: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDriveModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingDrive}>
                  {savingDrive ? <Loader2 size={16} className="spin" /> : 'Publish Camp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRIVE LOCATION PICKER MODAL */}
      <LocationPickerModal
        isOpen={showDriveMapPicker}
        onClose={() => setShowDriveMapPicker(false)}
        onSelectLocation={(loc) => {
          setDriveForm(p => ({
            ...p,
            address: loc.address || p.address,
            city: loc.city || p.city,
            mapsUrl: loc.mapsUrl || `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`,
            latitude: loc.latitude,
            longitude: loc.longitude,
          }));
          setShowDriveMapPicker(false);
        }}
        initialLocation={{
          latitude: driveForm.latitude,
          longitude: driveForm.longitude,
          address: driveForm.address,
          city: driveForm.city,
        }}
      />

      {/* CREATE ASSISTED REQUEST MODAL */}
      {showRequestModal && (
        <div className="code-red-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="code-red-modal" style={{ maxWidth: 620, width: '100%', padding: '18px 24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: '1.08rem', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                🆘 Submit Assisted Patient Request
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowRequestModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateRequest}>
              <div className="profile-form-grid" style={{ marginBottom: 10 }}>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Patient Full Name *</label>
                  <input className="input" placeholder="Patient Full Name" value={requestForm.patientName} onChange={e => setRequestForm(p => ({ ...p, patientName: e.target.value }))} required />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Patient / Attendant Phone</label>
                  <input className="input" placeholder="03xx-xxxxxxx" value={requestForm.seekerPhone} onChange={e => setRequestForm(p => ({ ...p, seekerPhone: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Blood Group *</label>
                  <select className="input" value={requestForm.bloodGroup} onChange={e => setRequestForm(p => ({ ...p, bloodGroup: e.target.value }))}>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Units Needed *</label>
                  <input type="number" min="1" className="input" value={requestForm.unitsRequired} onChange={e => setRequestForm(p => ({ ...p, unitsRequired: parseInt(e.target.value) || 1 }))} required />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Urgency *</label>
                  <select className="input" value={requestForm.urgency} onChange={e => setRequestForm(p => ({ ...p, urgency: e.target.value }))}>
                    <option value="urgent">⚡ Urgent</option>
                    <option value="critical">🚨 Critical (Code Red)</option>
                    <option value="standard">📅 Standard</option>
                  </select>
                </div>
              </div>

              <div className="profile-form-grid" style={{ marginBottom: 10 }}>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Hospital Name *</label>
                  <input className="input" placeholder="e.g. PIMS Hospital" value={requestForm.hospitalName} onChange={e => setRequestForm(p => ({ ...p, hospitalName: e.target.value }))} required />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Hospital City *</label>
                  <input className="input" value={requestForm.hospitalCity} onChange={e => setRequestForm(p => ({ ...p, hospitalCity: e.target.value }))} required />
                </div>
              </div>

              <div className="profile-form-grid" style={{ marginBottom: 10 }}>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Hospital Address / Ward</label>
                  <input className="input" placeholder="e.g. Ward 4, Emergency Dept" value={requestForm.hospitalAddress} onChange={e => setRequestForm(p => ({ ...p, hospitalAddress: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Exact Hospital Map Pin 📍</label>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ width: '100%', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: requestForm.latitude ? 'rgba(16, 185, 129, 0.15)' : undefined, borderColor: requestForm.latitude ? '#10b981' : undefined, color: requestForm.latitude ? '#34d399' : undefined }} onClick={() => setShowRequestMapPicker(true)}>
                    <MapPin size={15} /> {requestForm.latitude ? '📍 Location Pinned' : '📍 Pin Hospital on Map'}
                  </button>
                </div>
              </div>

              <div className="profile-form-grid" style={{ marginBottom: 10 }}>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Additional Notes / Patient Condition</label>
                  <input className="input" placeholder="e.g. Patient undergoing surgery in ICU" value={requestForm.additionalNotes} onChange={e => setRequestForm(p => ({ ...p, additionalNotes: e.target.value }))} />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 12 }}>
                <label className="input-label" style={{ fontSize: '0.75rem' }}>Hospital Blood Requisition Slip * (Image / PDF)</label>
                <input type="file" ref={fileRef} accept="image/*,application/pdf" onChange={e => setRequestFiles(Array.from(e.target.files))} style={{ display: 'none' }} />
                <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', height: 38, border: '1px dashed rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => fileRef.current?.click()}>
                  <Upload size={15} /> {requestFiles.length > 0 ? `📄 ${requestFiles.length} file selected` : 'Upload Hospital Slip Photo'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowRequestModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#f43f5e', borderColor: '#f43f5e' }} disabled={savingRequest}>
                  {savingRequest ? <Loader2 size={16} className="spin" /> : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSISTED REQUEST LOCATION PICKER MODAL */}
      <LocationPickerModal
        isOpen={showRequestMapPicker}
        onClose={() => setShowRequestMapPicker(false)}
        onSelectLocation={(loc) => {
          setRequestForm(p => ({
            ...p,
            hospitalName: loc.street ? (p.hospitalName || loc.street.split(',')[0]) : p.hospitalName,
            hospitalAddress: loc.street || p.hospitalAddress,
            hospitalCity: loc.city || p.hospitalCity,
            mapsUrl: loc.mapsUrl || `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`,
            latitude: loc.latitude,
            longitude: loc.longitude,
          }));
          setShowRequestMapPicker(false);
        }}
        initialLocation={{
          latitude: requestForm.latitude,
          longitude: requestForm.longitude,
          address: requestForm.hospitalAddress,
          city: requestForm.hospitalCity,
        }}
      />

      {/* RSVP LIST DRAWER MODAL */}
      {selectedDriveRSVPs && (
        <div className="code-red-overlay" onClick={() => setSelectedDriveRSVPs(null)}>
          <div className="code-red-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>👥 RSVP Donor List ({selectedDriveRSVPs.title})</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDriveRSVPs(null)}><X size={18} /></button>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {selectedDriveRSVPs.rsvps.map((rsvp, idx) => (
                <div key={idx} style={{ padding: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{rsvp.userName || 'Registered Donor'}</strong> ({rsvp.bloodGroup})
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Phone: {rsvp.userPhone || 'Provided in App'}</div>
                  </div>
                  <span className="badge badge-green">RSVP Confirmed</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`mobile-bottom-nav-item${activeTab === id ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={20} />
            <span>{label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
