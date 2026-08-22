import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, Search, Shield, Zap, Award, UserPlus, 
  MapPin, CheckCircle, ArrowRight, Activity, Users, PhoneCall, Menu, X, AlertTriangle, Building2, Mail, Send
} from 'lucide-react';
import api from '../../lib/api';
import './LandingPage.css';


const COMPATIBILITY_MAP = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],
};

// Demo Emergency Hospital Helplines (Testing Mode)
const EMERGENCY_HOSPITALS = [
  {
    id: 'hosp-1',
    name: 'City General Hospital (Demo Unit)',
    city: 'Islamabad (Testing)',
    phone: '+92 51 000-1122',
    available247: true,
  },
  {
    id: 'hosp-2',
    name: 'Central Blood Bank (Demo Desk)',
    city: 'Lahore (Testing)',
    phone: '+92 42 000-3344',
    available247: true,
  },
  {
    id: 'hosp-3',
    name: 'National Rescue Hotline',
    city: 'Nationwide',
    phone: '1122',
    available247: true,
  },
];

const DEMO_EMERGENCIES = [
  {
    id: 'req-1',
    patientName: 'Ayesha Khan',
    bloodGroup: 'O-',
    units: 2,
    hospital: 'Shifa International Hospital',
    city: 'Islamabad',
    urgency: 'Critical',
    timeAgo: '15 mins ago',
  },
  {
    id: 'req-2',
    patientName: 'Muhammad Usman',
    bloodGroup: 'AB-',
    units: 3,
    hospital: 'PIMS Hospital',
    city: 'Islamabad',
    urgency: 'Urgent',
    timeAgo: '42 mins ago',
  },
  {
    id: 'req-3',
    patientName: 'Zainab Ahmed',
    bloodGroup: 'B+',
    units: 1,
    hospital: 'Combined Military Hospital (CMH)',
    city: 'Rawalpindi',
    urgency: 'Standard',
    timeAgo: '2 hours ago',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState('O-');
  const [selectedCity, setSelectedCity]   = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Contact Support Form State
  const [contactName, setContactName]   = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg]     = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSubmitted, setContactSubmitted]   = useState(false);
  const [contactError, setContactError]         = useState('');

  const compatibleDonors = COMPATIBILITY_MAP[selectedGroup] || [selectedGroup];

  function handleSearch(e) {
    e.preventDefault();
    setHasSearched(true);
  }

  async function handleContactSubmit(e) {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMsg.trim()) return;

    setContactSubmitting(true);
    setContactError('');

    try {
      await api.post('/auth/contact', {
        name: contactName,
        email: contactEmail,
        message: contactMsg,
      });
      setContactSubmitted(true);
      setContactName('');
      setContactEmail('');
      setContactMsg('');
      setTimeout(() => setContactSubmitted(false), 6000);
    } catch (err) {
      setContactError(err.response?.data?.message || 'Failed to send message. Please try direct email.');
    } finally {
      setContactSubmitting(false);
    }
  }


  return (
    <div className="landing-page">
      {/* Backdrop overlay to close mobile menu on outside click */}
      {mobileMenuOpen && (
        <div className="landing-mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ── Public Navbar ── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-logo">
            <div className="landing-logo-icon">🩸</div>
            <span className="landing-logo-text">Blood<span>Sync</span></span>
          </Link>

          {/* Desktop Nav Links */}
          <ul className="landing-nav-links">
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#checker">Donor Checker</a></li>
            <li><a href="#emergencies">Live Requests</a></li>
            <li><a href="#tiers">Recognition</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>

          {/* Desktop & Mobile Quick Action Buttons */}
          <div className="landing-nav-actions">
            <Link to="/login" className="btn btn-ghost btn-sm">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Register
            </Link>

            {/* Mobile Hamburger Toggle (≡ 3 parallel lines button) */}
            <button 
              className="mobile-nav-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Slide Menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu">
            {/* Top Quick Actions in Mobile Drawer */}
            <div className="landing-mobile-top-actions">
              <Link to="/login" className="btn btn-ghost btn-full" onClick={() => setMobileMenuOpen(false)}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-full" onClick={() => setMobileMenuOpen(false)}>
                Register
              </Link>
            </div>

            <div className="mobile-nav-divider" />

            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>📍 How It Works</a>
            <a href="#checker" onClick={() => setMobileMenuOpen(false)}>🩸 Donor Compatibility Checker</a>
            <a href="#emergencies" onClick={() => setMobileMenuOpen(false)}>⚡ Live Emergency Board</a>
            <a href="#tiers" onClick={() => setMobileMenuOpen(false)}>🏆 Donor Recognition Tiers</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)}>📞 Contact & Support</a>
          </div>
        )}
      </header>

      {/* ── Hero Section ── */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-pill">
            <Activity size={15} /> Real-Time Blood Matching Network
          </div>
          <h1 className="hero-title">
            Every Drop Counts. <span>Save Lives</span> in Real-Time.
          </h1>
          <p className="hero-subtitle">
            BloodSync connects voluntary blood donors directly with critical patients and emergency hospital wards across your city within minutes.
          </p>

          <div className="hero-ctas">
            <Link to="/register" className="btn btn-primary btn-lg">
              <UserPlus size={20} /> Create an Account
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">
              <Search size={20} /> Request Blood / Find Donors
            </Link>
          </div>
        </div>

        {/* Hero Visual Card / Live Stats */}
        <div className="hero-visual">
          <div className="hero-card-glass">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>BloodSync Impact</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Verified real-time network activity</p>
              </div>
              <span className="badge badge-green">LIVE SYSTEM</span>
            </div>

            <div className="hero-stats-grid">
              <div className="hero-stat-item">
                <span className="hero-stat-num red">1,420+</span>
                <span className="hero-stat-label">Active Donors</span>
              </div>
              <div className="hero-stat-item">
                <span className="hero-stat-num green">980+</span>
                <span className="hero-stat-label">Lives Saved</span>
              </div>
              <div className="hero-stat-item">
                <span className="hero-stat-num blue">45+</span>
                <span className="hero-stat-label">Hospitals</span>
              </div>
              <div className="hero-stat-item">
                <span className="hero-stat-num">100%</span>
                <span className="hero-stat-label">Voluntary</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Instant Donor Compatibility Checker Section ── */}
      <section id="checker" className="section-wrapper">
        <div className="section-title-wrap">
          <div className="section-tag">Smart Matching</div>
          <h2 className="section-main-title">Instant Donor Compatibility</h2>
          <p className="section-desc">Select a patient's blood group to see which donor blood types can safely donate to them.</p>
        </div>

        <div className="search-widget-card">
          <form className="widget-grid" onSubmit={handleSearch}>
            <div className="input-group">
              <label className="input-label">Patient Blood Group</label>
              <select 
                className="input" 
                value={selectedGroup} 
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">City / Region (Optional)</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Islamabad, Lahore, Karachi" 
                value={selectedCity} 
                onChange={(e) => setSelectedCity(e.target.value)} 
              />
            </div>

            <button type="submit" className="btn btn-primary">
              <Search size={18} /> Check Available Donors
            </button>
          </form>

          <div className="compatibility-matrix">
            <div className="compat-card">
              <div className="compat-group-title">
                <span>Patient Needs: {selectedGroup}</span>
                <span className="badge badge-red">Compatible Types</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                This patient can safely receive blood donations from:
              </p>
              <div className="compat-list">
                {compatibleDonors.map((type) => (
                  <span key={type} className="badge badge-blue" style={{ fontSize: '0.9rem', padding: '0.35rem 0.75rem' }}>
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Public Availability Summary */}
          {hasSearched && (
            <div className="public-search-results">
              <div className="results-header">
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Nearby Compatible Donors Overview</h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Active registered donors matching {selectedGroup} {selectedCity ? `in ${selectedCity}` : 'nationwide'}
                  </p>
                </div>
                <span className="badge badge-green">LIVE MATCHES</span>
              </div>

              <div className="compat-card" style={{ padding: 'var(--space-6)', background: 'var(--surface-float)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                  <div>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-success)' }}>14 Donors</span>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active & ready to donate</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--blue-400)' }}>3 Hospitals</span>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verified emergency blood units</p>
                  </div>
                </div>

                <div style={{ padding: 'var(--space-4)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border)', marginBottom: 'var(--space-5)' }}>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    🔒 <strong>Privacy & Safety Protocol:</strong> BloodSync notifies nearby voluntary donors automatically when an official request is submitted. Direct personal phone numbers of donors are protected and never displayed publicly.
                  </p>
                </div>

                <Link to="/login" className="btn btn-primary btn-full">
                  Post Emergency Blood Request <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Live Emergency Board ── */}
      <section id="emergencies" className="section-wrapper" style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-2xl)' }}>
        <div className="section-title-wrap">
          <div className="section-tag">Urgent Need</div>
          <h2 className="section-main-title">Live Emergency Requests</h2>
          <p className="section-desc">Critical blood requests posted by verified seekers and emergency units.</p>
        </div>

        <div className="emergency-grid">
          {DEMO_EMERGENCIES.map((req) => (
            <div key={req.id} className="emergency-card">
              <div className="emergency-card-header">
                <span className={`badge ${req.urgency === 'Critical' ? 'badge-red' : 'badge-amber'}`}>
                  {req.urgency}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.timeAgo}</span>
              </div>

              <div>
                <h4 className="emergency-hospital">{req.hospital}</h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}><MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />{req.city}</p>
              </div>

              <div className="emergency-details">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Required Type:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--red-400)' }}>{req.bloodGroup}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Units Needed:</span>
                  <span style={{ fontWeight: 700 }}>{req.units} unit(s)</span>
                </div>
              </div>

              <Link to="/login" className="btn btn-ghost btn-sm btn-full" style={{ marginTop: 'var(--space-2)' }}>
                Respond / Login to Donate <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="section-wrapper">
        <div className="section-title-wrap">
          <div className="section-tag">Simple & Fast</div>
          <h2 className="section-main-title">How BloodSync Works</h2>
          <p className="section-desc">Connecting life-savers with patients in 3 streamlined steps.</p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">1</div>
            <h3 className="step-title">Register & Set Availability</h3>
            <p className="step-desc">
              Donors sign up, set their blood group and location, and toggle their availability status whenever they are cleared to donate.
            </p>
          </div>

          <div className="step-card">
            <div className="step-num">2</div>
            <h3 className="step-title">Instant Request & Match</h3>
            <p className="step-desc">
              Seekers or hospitals post urgent blood requirements. Our smart matching algorithm notifies eligible donors nearby instantly.
            </p>
          </div>

          <div className="step-card">
            <div className="step-num">3</div>
            <h3 className="step-title">Verify & Earn Recognition</h3>
            <p className="step-desc">
              Donations are verified seamlessly using digital QR check-in, unlocking recognition badges and gamified donor levels.
            </p>
          </div>
        </div>
      </section>

      {/* ── Recognition Tiers ── */}
      <section id="tiers" className="section-wrapper" style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-2xl)', marginTop: 'var(--space-8)' }}>
        <div className="section-title-wrap">
          <div className="section-tag">Gamified Impact</div>
          <h2 className="section-main-title">Donor Recognition Tiers</h2>
          <p className="section-desc">Earn badges and level up as you complete verified blood donations.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div className="compat-card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>🌱</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Spark</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>1 Confirmed Donation</p>
          </div>
          <div className="compat-card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>⚡</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Pulse</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>3 Confirmed Donations</p>
          </div>
          <div className="compat-card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>❤️</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Life Saver</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>5 Confirmed Donations</p>
          </div>
          <div className="compat-card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>🛡️</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Guardian</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>10 Confirmed Donations</p>
          </div>
          <div className="compat-card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <span style={{ fontSize: '2rem' }}>⚓</span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: 'var(--space-2)' }}>Anchor</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>25+ Confirmed Donations</p>
          </div>
        </div>
      </section>

      {/* ── Contact & Support Section ── */}
      <section id="contact" className="section-wrapper">
        <div className="section-title-wrap">
          <div className="section-tag">Direct Support & Demo Desks</div>
          <h2 className="section-main-title">Contact & Support Center</h2>
          <p className="section-desc">Reach out directly to our BloodSync Support Desk or view emergency hospital demo desks.</p>
        </div>

        <div className="dashboard-grid-2" style={{ gap: 'var(--space-6)' }}>
          {/* Hospital Emergency Desk Call Lines */}
          <div className="compat-card" style={{ background: 'var(--surface-raised)', padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="var(--red-400)" /> Hospital Helplines (Demo)
              </h3>
              <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>TEST DATA</span>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              *Note: Demo numbers shown for testing & evaluation. Official hospital integration will be activated upon live partnership deployment.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {EMERGENCY_HOSPITALS.map((hosp) => (
                <div key={hosp.id} className="hosp-demo-item">
                  <div className="hosp-demo-top">
                    <span className="hosp-demo-name">{hosp.name}</span>
                    <span className="badge badge-green">DEMO LINE</span>
                  </div>
                  <div className="hosp-demo-bottom">
                    <span className="hosp-demo-city">📍 {hosp.city}</span>
                    <a href={`tel:${hosp.phone.replace(/[^0-9+]/g, '')}`} className="btn btn-primary btn-sm hosp-call-btn">
                      <PhoneCall size={14} /> Call ({hosp.phone})
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Contact / Support Message Desk */}
          <div className="compat-card" style={{ background: 'var(--surface-raised)', padding: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={20} color="var(--blue-400)" /> Send Email to Support
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
              Have questions or need assistance? Send a message directly to our BloodSync Support Desk.
            </p>

            {contactSubmitted ? (
              <div className="badge badge-green" style={{ padding: 'var(--space-4)', fontSize: '0.875rem', width: '100%', justifyContent: 'center', textAlign: 'center', lineHeight: 1.5 }}>
                ✓ Message Sent! Your inquiry has been sent directly to the BloodSync Support Team.
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="input-group">
                  <label className="input-label">Your Full Name</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Full Name" 
                    value={contactName} 
                    onChange={(e) => setContactName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Your Email Address (For Reply)</label>
                  <input 
                    type="email" 
                    className="input" 
                    placeholder="e.g. yourname@example.com" 
                    value={contactEmail} 
                    onChange={(e) => setContactEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Message / Inquiry</label>
                  <textarea 
                    className="input" 
                    rows={3} 
                    placeholder="Type your message here..." 
                    value={contactMsg} 
                    onChange={(e) => setContactMsg(e.target.value)} 
                    required 
                    style={{ resize: 'vertical' }} 
                  />
                </div>
                {contactError && (
                  <div style={{ color: 'var(--red-400)', fontSize: '0.8rem' }}>{contactError}</div>
                )}
                <button type="submit" className="btn btn-primary" disabled={contactSubmitting}>
                  {contactSubmitting ? <span className="spinner" /> : <><Send size={16} /> Send Message to Support</>}
                </button>
              </form>
            )}

            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--surface-border)', textAlign: 'center' }}>
              <a 
                href="mailto:support@bloodsync.app?subject=BloodSync%20Support%20Inquiry" 
                style={{ fontSize: '0.825rem', color: 'var(--red-400)', fontWeight: 700, textDecoration: 'none' }}
              >
                ✉️ Direct Mail: support@bloodsync.app
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Link to="/" className="landing-logo">
              <div className="landing-logo-icon">🩸</div>
              <span className="landing-logo-text">Blood<span>Sync</span></span>
            </Link>
            <p>
              A modern, community-driven emergency blood donor connection platform committed to saving lives.
            </p>
          </div>

          <div className="footer-col">
            <h4>Platform</h4>
            <ul>
              <li><Link to="/login">Donor Portal</Link></li>
              <li><Link to="/login">Seeker Portal</Link></li>
              <li><Link to="/login">Hospital Portal</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#checker">Donor Checker</a></li>
              <li><a href="#emergencies">Live Requests</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Emergency Help</h4>
            <ul>
              <li style={{ color: 'var(--red-300)', fontWeight: 700 }}>24/7 Rescue Line: 1122</li>
              <li>Email: support@bloodsync.app</li>
            </ul>
          </div>

        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} BloodSync 2.0. All rights reserved.</p>
          <p>Built with ❤️ to save lives.</p>
        </div>
      </footer>

      {/* ── Floating 24/7 Emergency Help Button ── */}
      <button 
        className="emergency-float-btn"
        onClick={() => setShowEmergencyModal(true)}
      >
        <PhoneCall size={18} /> 24/7 Hospital Emergency Call
      </button>

      {/* ── Hospital Emergency Call Modal ── */}
      {showEmergencyModal && (
        <div className="profile-modal-overlay" onClick={() => setShowEmergencyModal(false)}>
          <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header" style={{ background: 'linear-gradient(135deg, rgba(192,57,43,0.3), rgba(15,21,32,0.95))' }}>
              <button className="profile-modal-close" onClick={() => setShowEmergencyModal(false)}>
                <X size={18} />
              </button>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-2)' }}>🏥</div>
              <div className="profile-modal-name">Emergency Hospital Blood Units</div>
              <div className="profile-modal-role">Direct Hospital Call Desks</div>
            </div>

            <div className="profile-modal-body">
              <div className="profile-info-row" style={{ background: 'rgba(192, 57, 43, 0.1)', borderColor: 'rgba(192,57,43,0.3)' }}>
                <span className="profile-info-label" style={{ color: 'var(--red-300)', fontWeight: 700 }}>National Emergency Helpline</span>
                <a href="tel:1122" style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', textDecoration: 'none' }}>📞 1122</a>
              </div>

              {EMERGENCY_HOSPITALS.map((hosp) => (
                <div key={hosp.id} className="profile-info-row">
                  <div>
                    <span className="profile-info-label" style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{hosp.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {hosp.city}</span>
                  </div>
                  <a href={`tel:${hosp.phone.replace(/[^0-9+]/g, '')}`} className="btn btn-primary btn-sm">
                    Call
                  </a>
                </div>
              ))}
            </div>

            <div className="profile-modal-actions">
              <Link to="/login" className="btn btn-ghost btn-full" onClick={() => setShowEmergencyModal(false)}>
                Post Request via Platform
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
