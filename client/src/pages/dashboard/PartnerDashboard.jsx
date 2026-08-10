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
  Plus, CheckCircle2, AlertCircle, FileText, Upload, LogOut, Loader2, ExternalLink, X, ShieldCheck, ChevronRight
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
  const [requestForm, setRequestForm] = useState({
    bloodGroup: 'O+', unitsRequired: 1, urgency: 'urgent',
    hospitalName: '', hospitalCity: org?.address?.city || '', hospitalAddress: '',
    patientName: '', additionalNotes: '', seekerPhone: '',
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

  return (
    <div className="hospital-dash-layout">
      {/* Sidebar Navigation */}
      <aside className="hospital-sidebar">
        <div className="hospital-sidebar-brand">
          <div className="brand-logo" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>🤝</div>
          <div className="brand-info">
            <span className="brand-title">BloodSync</span>
            <span className="brand-badge" style={{ background: 'rgba(37, 99, 235, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>Partner Portal</span>
          </div>
        </div>

        <div style={{ padding: '12px 16px', margin: '0 12px 16px 12px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {org.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
            🤝 Humanitarian Partner
          </div>
        </div>

        <nav className="hospital-nav">
          <button className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <Building2 size={18} /> Overview
          </button>

          <button className={`nav-link ${activeTab === 'drives' ? 'active' : ''}`} onClick={() => setActiveTab('drives')}>
            <Calendar size={18} /> Drives & Camps
          </button>

          <button className={`nav-link ${activeTab === 'assisted' ? 'active' : ''}`} onClick={() => setActiveTab('assisted')}>
            <HeartHandshake size={18} /> Assisted Requests
          </button>

          <button className={`nav-link ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            <ClipboardList size={18} /> History Log
          </button>

          <button className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <ShieldCheck size={18} /> Profile & Verification
          </button>
        </nav>

        <div className="hospital-sidebar-footer">
          <button className="nav-link nav-logout" onClick={onLogout}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="hospital-main">
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
                <button className="btn btn-primary btn-sm" onClick={() => { setActiveTab('drives'); setShowDriveModal(true); }}>
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
                <button className="btn btn-primary btn-sm" style={{ background: '#f43f5e', borderColor: '#f43f5e' }} onClick={() => { setActiveTab('assisted'); setShowRequestModal(true); }}>
                  <Plus size={16} /> Submit Assisted Request
                </button>
              </div>
            </div>
          </div>
        )}

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
      </main>

      {/* CREATE DRIVE MODAL */}
      {showDriveModal && (
        <div className="code-red-overlay" onClick={() => setShowDriveModal(false)}>
          <div className="code-red-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>🎪 Create Blood Donation Camp</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDriveModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateDrive}>
              <div className="input-group" style={{ marginBottom: 12 }}>
                <label className="input-label">Camp Title *</label>
                <input className="input" placeholder="e.g. NUST University Annual Blood Drive" value={driveForm.title} onChange={e => setDriveForm(p => ({ ...p, title: e.target.value }))} required />
              </div>

              <div className="profile-form-grid" style={{ marginBottom: 12 }}>
                <div className="input-group">
                  <label className="input-label">Camp Date *</label>
                  <input type="date" className="input" value={driveForm.date} onChange={e => setDriveForm(p => ({ ...p, date: e.target.value }))} required />
                </div>
                <div className="input-group">
                  <label className="input-label">City *</label>
                  <input className="input" value={driveForm.city} onChange={e => setDriveForm(p => ({ ...p, city: e.target.value }))} required />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 12 }}>
                <label className="input-label">Camp Location Address</label>
                <input className="input" placeholder="e.g. Main Auditorium, Sector H-12, Islamabad" value={driveForm.address} onChange={e => setDriveForm(p => ({ ...p, address: e.target.value }))} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDriveModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingDrive}>
                  {savingDrive ? <Loader2 size={16} className="spin" /> : 'Publish Camp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ASSISTED REQUEST MODAL */}
      {showRequestModal && (
        <div className="code-red-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="code-red-modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>🆘 Submit Assisted Patient Request</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowRequestModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateRequest}>
              <div className="profile-form-grid" style={{ marginBottom: 12 }}>
                <div className="input-group">
                  <label className="input-label">Patient Name</label>
                  <input className="input" placeholder="Patient Full Name" value={requestForm.patientName} onChange={e => setRequestForm(p => ({ ...p, patientName: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Blood Group *</label>
                  <select className="input" value={requestForm.bloodGroup} onChange={e => setRequestForm(p => ({ ...p, bloodGroup: e.target.value }))}>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="profile-form-grid" style={{ marginBottom: 12 }}>
                <div className="input-group">
                  <label className="input-label">Hospital Name *</label>
                  <input className="input" placeholder="e.g. PIMS Hospital" value={requestForm.hospitalName} onChange={e => setRequestForm(p => ({ ...p, hospitalName: e.target.value }))} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Hospital City *</label>
                  <input className="input" value={requestForm.hospitalCity} onChange={e => setRequestForm(p => ({ ...p, hospitalCity: e.target.value }))} required />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 14 }}>
                <label className="input-label">Hospital Blood Requisition Slip * (Image / PDF)</label>
                <input type="file" ref={fileRef} accept="image/*,application/pdf" onChange={e => setRequestFiles(Array.from(e.target.files))} style={{ display: 'none' }} />
                <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', border: '1px dashed rgba(59, 130, 246, 0.4)', padding: 12 }} onClick={() => fileRef.current?.click()}>
                  <Upload size={16} /> {requestFiles.length > 0 ? `${requestFiles.length} file selected` : 'Upload Hospital Slip Photo'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowRequestModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: '#f43f5e', borderColor: '#f43f5e' }} disabled={savingRequest}>
                  {savingRequest ? <Loader2 size={16} className="spin" /> : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
}
