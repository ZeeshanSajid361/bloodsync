/**
 * Donor Dashboard.
 *
 * Shows the donor's complete profile in three tab views:
 *   Overview   — eligibility card, stats, recognition level, availability toggle
 *   Edit profile — form to update name, city, blood group, bio, etc.
 *   History    — placeholder for donation history (Phase 7)
 *
 * Data comes from the useDonorProfile hook (GET /api/donors/me).
 * Mutations call the API directly and then call refetch() to keep the UI
 * in sync without needing a state management library.
 */

import { useState, useEffect, useCallback, Component } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, History, LogOut,
  Droplets, MapPin, Phone, Calendar, AlertCircle,
  CheckCircle2, Clock, Edit3, Save, X, FileText, Mail, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth }          from '../../context/AuthContext';
import { useDonorProfile }  from '../../hooks/useDonorProfile';
import useNotifications     from '../../hooks/useNotifications';
import NotificationBell     from '../../components/NotificationBell';
import QRCheckIn            from '../../components/QRCheckIn';
import AppSpotlightTour     from '../../components/AppSpotlightTour';
import api                  from '../../lib/api';
import '../../styles/dashboard.css';

// ── Blood groups for the edit form select ─────────────────────────────────
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ── Sidebar navigation items ──────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview',      icon: LayoutDashboard },
  { id: 'requests', label: 'Live Requests', icon: Droplets },
  { id: 'edit',     label: 'Edit Profile',  icon: Edit3 },
];

const DONOR_TOUR_STEPS = [
  {
    targetSelector: '#donor-availability-card',
    title: 'Active Availability Status',
    description: 'Your profile is automatically set to Active so emergency blood seekers near you can find you. Toggle your status anytime right here!',
    icon: CheckCircle2,
    preferredPos: 'bottom',
  },
  {
    targetSelector: '#nav-requests',
    title: 'Live Blood Requests',
    description: 'Click here to view real-time patient blood requests matching your blood type. You can pledge to donate and open exact hospital directions!',
    icon: Droplets,
    preferredPos: 'right',
  },
  {
    targetSelector: '#notification-bell',
    title: 'Instant Alerts & QR Check-In',
    description: 'Receive real-time alerts when blood is needed near you. Present your QR check-in code at the hospital for instant verification!',
    icon: HelpCircle,
    preferredPos: 'left',
  },
];

export default function DonorDashboard() {
  const { user, logout }       = useAuth();
  const { donor, loading, error, refetch } = useDonorProfile();
  const navigate               = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const notifs = useNotifications();

  // Trigger onboarding modal on first login
  useEffect(() => {
    const hasSeen = localStorage.getItem('bloodsync_onboarding_donor');
    if (!hasSeen) {
      const timer = setTimeout(() => setShowOnboarding(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-refetch donor profile & history silently every 8 seconds so status updates (like hospital fulfillment) update in real-time without screen flickering or reloading
  useEffect(() => {
    const interval = setInterval(() => {
      refetch(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Refetch silently immediately when a new push notification arrives
  useEffect(() => {
    if (notifs.unreadCount > 0) {
      refetch(true);
    }
  }, [notifs.unreadCount, refetch]);

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
              <div className="sidebar-user-role">Donor Profile</div>
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
              onClick={() => setActiveTab(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-nav-link"
            onClick={() => setShowOnboarding(true)}
            style={{ color: '#38bdf8' }}
          >
            <HelpCircle size={20} />
            <span>App Guide & Tour</span>
          </button>
          <button id="donor-logout" className="sidebar-nav-link" onClick={handleLogout}>
            <LogOut size={20} />
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
          
          {/* User Avatar Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowOnboarding(true)}
              className="btn btn-ghost btn-sm"
              style={{ padding: '6px', color: '#38bdf8' }}
              title="Open App Guide & Tour"
            >
              <HelpCircle size={20} />
            </button>
            <button 
              className="user-avatar-pill" 
              onClick={() => setShowProfileModal(true)}
              aria-label="View profile details"
            >
              {initials}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="dashboard-main">
          {loading && !donor && <DashboardSkeleton />}
          {error && !donor   && <ErrorBanner message={error} onRetry={() => refetch(false)} />}

          {donor && (
            <>
              {activeTab === 'overview' && (
                <OverviewTab donor={donor} refetch={refetch} onOpenTour={() => setShowOnboarding(true)} />
              )}
              {activeTab === 'edit' && (
                <EditProfileTab donor={donor} refetch={refetch} onSaved={() => setActiveTab('overview')} />
              )}
              {(activeTab === 'requests' || activeTab === 'history') && (
                <HistoryTab donor={donor} />
              )}
            </>
          )}
        </main>

        {/* Mobile Bottom Navigation (Clean 3 Tabs) */}
        <nav className="mobile-bottom-nav">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`mobile-nav-item${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Full Profile View Modal (Opens when tapping [ZS] Avatar) ── */}
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
              <div className="profile-modal-role">Voluntary Blood Donor</div>
            </div>

            <div className="profile-modal-body">
              <div className="profile-info-row">
                <span className="profile-info-label">Email</span>
                <span className="profile-info-val">{user?.email}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Blood Group</span>
                <span className="blood-group-badge">{donor?.bloodGroup || 'Not set'}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">City</span>
                <span className="profile-info-val">{donor?.city || 'Not set'}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Availability</span>
                <span className={`badge ${donor?.isAvailable ? 'badge-green' : 'badge-amber'}`}>
                  {donor?.isAvailable ? '✓ Active in Search' : 'Unavailable'}
                </span>
              </div>
            </div>

            <div className="profile-modal-actions">
              <button 
                className="btn btn-primary btn-full"
                onClick={() => {
                  setActiveTab('edit');
                  setShowProfileModal(false);
                }}
              >
                <Edit3 size={18} /> Edit Profile Details
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

      {/* Interactive Element-Targeted Spotlight Guided Tour */}
      <AppSpotlightTour
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        steps={DONOR_TOUR_STEPS}
        tourKey="donor"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════
function OverviewTab({ donor, refetch }) {
  return (
    <>
      {/* Page header */}
      <div className="dashboard-topbar animate-fade-up">
        <div>
          <h1 className="dashboard-page-title">
            Good {getTimeGreeting()},{' '}
            {donor.name.split(' ')[0]} 👋
          </h1>
          <p className="dashboard-page-subtitle">
            Here is your donation overview for today.
          </p>
        </div>

        {/* Blood group badge */}
        <div className="blood-group-badge" title="Your blood group">
          {donor.bloodGroup}
        </div>
      </div>

      {/* ── Row 1: Stats ── */}
      <div className="dashboard-grid-3" style={{ marginBottom: 'var(--space-5)' }}>
        <StatCard
          label="Confirmed Donations"
          value={donor.confirmedDonations}
          sub="All-time verified"
          icon="🩸"
          iconBg="rgba(192,57,43,0.15)"
        />
        <StatCard
          label="Blood Group"
          value={donor.bloodGroup}
          sub={donor.gender === 'male' ? '90-day cooldown' : '120-day cooldown'}
          icon="💉"
          iconBg="rgba(21,101,192,0.15)"
        />
        <StatCard
          label="Member Since"
          value={formatDate(donor.memberSince)}
          sub={`${daysSince(donor.memberSince)} days on BloodSync`}
          icon="📅"
          iconBg="rgba(124,58,237,0.15)"
        />
      </div>

      {/* ── Row 2: Eligibility + Availability ── */}
      <div className="dashboard-grid-2" style={{ marginBottom: 'var(--space-5)' }}>
        <EligibilityCard eligibility={donor.eligibility} />
        <AvailabilityCard
          isAvailable={donor.isAvailable}
          eligible={donor.eligibility.eligible}
          onToggle={async (val) => {
            try {
              await api.patch('/donors/me/availability', { isAvailable: val });
              toast.success(val ? 'You are now available.' : 'Marked as unavailable.');
              refetch();
            } catch (err) {
              toast.error(err.response?.data?.message || 'Failed to update availability.');
            }
          }}
        />
      </div>

      {/* ── Row 3: Recognition level ── */}
      <LevelCard level={donor.level} confirmedDonations={donor.confirmedDonations} allLevels={donor.allLevels} />

      {/* ── Row 4: Quick info ── */}
      <QuickInfoCard donor={donor} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  ELIGIBILITY CARD
// ═══════════════════════════════════════════════════════════════════════════
function EligibilityCard({ eligibility }) {
  const { eligible, nextEligibleDate, daysUntilEligible } = eligibility;
  const weeks = Math.floor(daysUntilEligible / 7);
  const remDays = daysUntilEligible % 7;

  return (
    <div className={`eligibility-card ${eligible ? 'eligible' : 'ineligible'}`}>
      <div className="eligibility-card-glow" />

      <div className="eligibility-status-row">
        <div className="eligibility-icon">
          {eligible ? '✅' : '⏳'}
        </div>
        <div>
          <div className="eligibility-title">
            {eligible ? 'Eligible to Donate' : 'Cooldown Period Active'}
          </div>
          <div className="eligibility-detail">
            {eligible
              ? 'You are cleared to donate blood right now.'
              : `Next eligible to donate on ${formatDate(nextEligibleDate)}`}
          </div>
        </div>
      </div>

      {!eligible && daysUntilEligible > 0 && (
        <div>
          <div className="eligibility-countdown">
            <CountdownBox value={`${weeks}w ${remDays}d`} label="Remaining Time" />
            <CountdownBox value={daysUntilEligible}       label="Total Days Left" />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '8px', lineHeight: '1.3' }}>
            💡 Medical Cooldown Rule: WHO safety guidelines mandate a rest period (90 days for males / 120 days for females) after each blood donation to rebuild red blood cells.
          </div>
        </div>
      )}
    </div>
  );
}

function CountdownBox({ value, label }) {
  return (
    <div className="countdown-box">
      <span className="countdown-value">{value}</span>
      <span className="countdown-label">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  AVAILABILITY CARD
// ═══════════════════════════════════════════════════════════════════════════
function AvailabilityCard({ isAvailable, eligible, onToggle }) {
  const [pending, setPending] = useState(false);

  async function handleChange(e) {
    if (pending) return;
    const val = e.target.checked;
    setPending(true);
    await onToggle(val);
    setPending(false);
  }

  return (
    <div className="availability-card" id="donor-availability-card">
      <div className="availability-info">
        <h4>Availability Status</h4>
        <p>
          {isAvailable
            ? eligible
              ? 'You are visible to seekers and can receive requests.'
              : 'Available, but currently in the cooldown period.'
            : 'You are hidden from search results and alerts.'}
        </p>
        {!eligible && isAvailable && (
          <span
            className="badge badge-amber"
            style={{ marginTop: 'var(--space-3)', display: 'inline-flex' }}
          >
            ⚠ On cooldown
          </span>
        )}
        {eligible && isAvailable && (
          <span
            className="badge badge-green"
            style={{ marginTop: 'var(--space-3)', display: 'inline-flex' }}
          >
            ✓ Active in search
          </span>
        )}
      </div>

      <label className="toggle-switch" aria-label="Toggle availability">
        <input
          id="availability-toggle"
          type="checkbox"
          checked={isAvailable}
          onChange={handleChange}
          disabled={pending}
        />
        <span className="toggle-track" />
      </label>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  RECOGNITION LEVEL CARD
// ═══════════════════════════════════════════════════════════════════════════
function LevelCard({ level, confirmedDonations, allLevels }) {
  if (!level) {
    return (
      <div className="card animate-fade-up" style={{
        marginBottom: 'var(--space-5)',
        padding: 'var(--space-6)',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            fontSize: '2rem',
            background: 'rgba(245, 158, 11, 0.15)',
            width: 56,
            height: 56,
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>🌱</div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>Donor Recognition System</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Complete your first confirmed donation to earn your first recognition badge.</div>
          </div>
        </div>
        <LevelTiers allLevels={allLevels} />
      </div>
    );
  }

  const progress = Math.min(100, Math.max(0, (level.progress || 0) * 100));

  return (
    <div className="card animate-fade-up" style={{
      marginBottom: 'var(--space-5)',
      padding: 'var(--space-6)',
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))',
      border: `1px solid ${level.color}55`,
      boxShadow: `0 10px 25px -5px ${level.color}15`,
      borderRadius: '18px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            fontSize: '2.2rem',
            background: `${level.color}25`,
            width: 64,
            height: 64,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${level.color}55`,
            boxShadow: `0 0 15px ${level.color}30`
          }}>
            {level.icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: level.color, letterSpacing: '0.5px' }}>
                {level.label} Level
              </span>
              <span style={{
                background: `${level.color}20`,
                color: level.color,
                border: `1px solid ${level.color}40`,
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                ACTIVE BADGE
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {level.description}
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '8px 16px',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            Lifetime Verified
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc' }}>
            {confirmedDonations} Confirmed Donation{confirmedDonations !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {level.nextLevel && (
        <div style={{ marginBottom: '20px', background: 'rgba(15, 23, 42, 0.6)', padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-primary)' }}>
              Progress to {level.nextLevel.icon} {level.nextLevel.label}
            </span>
            <span style={{ color: level.color }}>
              {level.donationsToNextLevel} more donation{level.donationsToNextLevel !== 1 ? 's' : ''} needed
            </span>
          </div>
          <div style={{ height: '8px', width: '100%', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${level.color}, #38bdf8)`, borderRadius: '4px', transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      <LevelTiers allLevels={allLevels} />
    </div>
  );
}

function LevelTiers({ allLevels = [] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '12px' }}>
      {allLevels.map((l) => (
        <div
          key={l.id}
          style={{
            background: l.unlocked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${l.unlocked ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
            borderRadius: '12px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            opacity: l.unlocked ? 1 : 0.6
          }}
          title={`${l.label} — ${l.minDonations}+ donations`}
        >
          <span style={{ fontSize: '1.4rem' }}>{l.icon}</span>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: l.unlocked ? '#34d399' : 'var(--text-muted)' }}>
              {l.label}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {l.unlocked ? 'Unlocked ✓' : `${l.minDonations}+ Don.`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  QUICK INFO CARD
// ═══════════════════════════════════════════════════════════════════════════
function QuickInfoCard({ donor }) {
  return (
    <div className="card" style={{ marginTop: 'var(--space-5)' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
        Profile Summary
      </h3>
      <div className="dashboard-grid-2">
        <InfoRow icon={<User size={15} />}      label="Full Name"    value={donor.name} />
        <InfoRow icon={<Droplets size={15} />}  label="Blood Group"  value={donor.bloodGroup} />
        <InfoRow icon={<MapPin size={15} />}    label="City"         value={donor.city || '—'} />
        <InfoRow icon={<Phone size={15} />}     label="Phone"        value={donor.phone || '—'} />
        <InfoRow icon={<Calendar size={15} />}  label="Last Donation"
          value={donor.lastDonationDate ? formatDate(donor.lastDonationDate) : 'Never donated'} />
        <InfoRow icon={<User size={15} />}      label="Age / Gender"
          value={`${donor.age} yrs · ${capitalise(donor.gender)}`} />
      </div>
      {donor.bio && (
        <div style={{
          marginTop: 'var(--space-5)',
          padding: 'var(--space-4)',
          background: 'var(--surface-float)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
        }}>
          &ldquo;{donor.bio}&rdquo;
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
      <span style={{ color: 'var(--text-muted)', marginTop: 2 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  EDIT PROFILE TAB
// ═══════════════════════════════════════════════════════════════════════════
function EditProfileTab({ donor, refetch, onSaved }) {
  const [form, setForm] = useState({
    name:        donor.name        || '',
    phone:       donor.phone       || '',
    city:        donor.city        || '',
    age:         donor.age         || '',
    gender:      donor.gender      || 'male',
    bloodGroup:  donor.bloodGroup  || 'O+',
    bio:         donor.bio         || '',
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
      await api.put('/donors/me', {
        name:       form.name.trim(),
        phone:      form.phone.trim() || undefined,
        city:       form.city.trim()  || undefined,
        age:        Number(form.age),
        gender:     form.gender,
        bloodGroup: form.bloodGroup,
        bio:        form.bio.trim()   || undefined,
      });
      await refetch();
      toast.success('Profile updated successfully.');
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
          <h1 className="dashboard-page-title">Edit Profile Details</h1>
          <p className="dashboard-page-subtitle">Update your voluntary donor profile, contact information, and blood group.</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onSaved}
        >
          <X size={16} /> Cancel
        </button>
      </div>

      <div className="profile-form-card animate-fade-up" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={20} color="#ef4444" /> Personal & Medical Profile
          </div>
          <div className="badge badge-green" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
            ✓ Verified Donor Account
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="profile-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>

            {/* Name */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-name">
                Full Name <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <User className="input-icon" size={17} />
                <input
                  id="edit-name"
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
              <label className="input-label" htmlFor="edit-phone">Phone Number</label>
              <div className="input-wrapper">
                <Phone className="input-icon" size={17} />
                <input
                  id="edit-phone"
                  name="phone"
                  className="input has-icon"
                  placeholder="+92 300 0000000"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* City */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-city">City / Region</label>
              <div className="input-wrapper">
                <MapPin className="input-icon" size={17} />
                <input
                  id="edit-city"
                  name="city"
                  className="input has-icon"
                  placeholder="Rawalpindi / Islamabad"
                  value={form.city}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Age */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-age">
                Age <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <Calendar className="input-icon" size={17} />
                <input
                  id="edit-age"
                  name="age"
                  type="number"
                  className="input has-icon"
                  min={18}
                  max={65}
                  value={form.age}
                  onChange={handleChange}
                  placeholder="18 - 65"
                  required
                />
              </div>
            </div>

            {/* Gender */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-gender">
                Gender <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <User className="input-icon" size={17} />
                <select
                  id="edit-gender"
                  name="gender"
                  className="input has-icon"
                  value={form.gender}
                  onChange={handleChange}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Blood group */}
            <div className="input-group">
              <label className="input-label" htmlFor="edit-bloodGroup">
                Blood Group <span className="required">*</span>
              </label>
              <div className="input-wrapper">
                <Droplets className="input-icon" size={17} />
                <select
                  id="edit-bloodGroup"
                  name="bloodGroup"
                  className="input has-icon"
                  value={form.bloodGroup}
                  onChange={handleChange}
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bio */}
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label" htmlFor="edit-bio">
                Donor Bio & Message <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <div className="input-wrapper" style={{ alignItems: 'flex-start' }}>
                <FileText className="input-icon" size={17} style={{ marginTop: '12px' }} />
                <textarea
                  id="edit-bio"
                  name="bio"
                  className="input has-icon"
                  rows={3}
                  maxLength={300}
                  placeholder="A short note about your availability or blood donation pledge..."
                  value={form.bio}
                  onChange={handleChange}
                  style={{ resize: 'vertical', minHeight: 80, paddingTop: '10px' }}
                />
              </div>
            </div>
          </div>

          {apiError && (
            <div className="flex items-center gap-2 mt-4"
              style={{ color: 'var(--red-400)', fontSize: '0.875rem' }}>
              <AlertCircle size={16} />{apiError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              id="edit-save"
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontWeight: 700 }}
            >
              {saving ? <span className="spinner" /> : <Save size={18} />}
              Save Changes
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onSaved}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  HISTORY TAB  (Phase 7 — QR Check-in)
// ═══════════════════════════════════════════════════════════════════════════
function useDonorRequests() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const fetchRequests = useCallback(() => {
    api.get('/donors/requests')
      .then(r => setRequests(r.data.data || []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return { requests, loading, refetch: fetchRequests };
}

const STATUS_LABELS = {
  pending_review: { label: 'Pending Review', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
  approved:       { label: 'Approved',        color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
  fulfilled:      { label: 'Fulfilled',       color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' },
  rejected:       { label: 'Rejected',        color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
  cancelled:      { label: 'Cancelled',       color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.12)', border: 'rgba(156, 163, 175, 0.3)' },
};

class HistoryTabErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', padding: 20 }}>
        <h2>HistoryTab Crashed</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{this.state.error?.stack}</pre>
      </div>;
    }
    return <HistoryTabInner {...this.props} />;
  }
}

function HistoryTabInner({ donor }) {
  const { requests, loading, refetch } = useDonorRequests();

  const URGENCY_RANK = { critical: 1, urgent: 2, routine: 3, standard: 3, regular: 3 };
  const getUrgencyRank = (u) => URGENCY_RANK[(u || '').toLowerCase()] ?? 4;

  const grouped = [...requests].sort((a, b) => {
    // 1. Approved/Active requests come first
    const activeA = a.status === 'approved' ? 0 : 1;
    const activeB = b.status === 'approved' ? 0 : 1;
    if (activeA !== activeB) return activeA - activeB;

    // 2. Sort by Urgency priority (Critical -> Urgent -> Routine)
    const rankA = getUrgencyRank(a.urgency);
    const rankB = getUrgencyRank(b.urgency);
    if (rankA !== rankB) return rankA - rankB;

    // 3. Sort by Recency tie-breaker (Latest notification / request time first)
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <>
      <div className="dashboard-topbar animate-fade-up">
        <div>
          <h1 className="dashboard-page-title">Live Blood Requests</h1>
          <p className="dashboard-page-subtitle">
            {donor.confirmedDonations} confirmed donation{donor.confirmedDonations !== 1 ? 's' : ''} · Active emergency blood seeker requests matching your blood group.
          </p>
        </div>
      </div>

      {donor.eligibility && donor.eligibility.eligible === false && (
        <div className="animate-fade-up" style={{
          marginBottom: 'var(--space-5)',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.15))',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ fontSize: '2rem' }}>⏳</div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f87171' }}>
              Post-Donation Cooldown Active
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Your body is recovering after your recent donation. Next eligible donation date: <strong>{formatDate(donor.eligibility.nextEligibleDate)}</strong>. Travel pledges are paused to protect your health & safety.
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
        </div>
      )}

      {!loading && grouped.length === 0 && (
        <div className="card animate-fade-up" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-5)' }}>🩺</div>
          <h3>No donation activity yet</h3>
          <p className="mt-4" style={{ maxWidth: 380, margin: 'var(--space-4) auto 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Once a blood seeker&apos;s request compatible with your blood group is approved, it will appear here.
            You can then generate a QR code to present at the hospital.
          </p>
        </div>
      )}

      {!loading && grouped.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {grouped.map(req => {
            const meta = STATUS_LABELS[req.status] || { label: req.status, color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.12)', border: 'rgba(156, 163, 175, 0.3)' };
            return (
              <div
                key={req._id}
                className="card animate-fade-up"
                style={{
                  padding: 'var(--space-5) var(--space-6)',
                  borderLeft: `4px solid ${meta.color}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                      <span style={{
                        background: 'linear-gradient(135deg, var(--red-700), var(--red-900))',
                        color: 'var(--red-200)',
                        padding: '2px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                      }}>{req.patientBloodGroup}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {req.hospitalName}
                      </span>
                      {req.urgency === 'critical' && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--red-400)', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          🚨 CRITICAL
                        </span>
                      )}
                      {req.urgency === 'urgent' && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          ⚠️ URGENT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {req.hospitalCity && <span>{req.hospitalCity} · </span>}
                      Submitted {formatDate(req.createdAt)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: meta.color,
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: `1px solid ${meta.border}`,
                    background: meta.bg,
                    whiteSpace: 'nowrap'
                  }}>
                    {meta.label.toUpperCase()}
                  </span>
                </div>

                {/* QR Check-in & Commitment — only shown for approved requests */}
                <QRCheckIn
                  requestId={req._id}
                  requestStatus={req.status}
                  hospitalName={req.hospitalName}
                  hospitalCity={req.hospitalCity}
                  hospitalAddress={req.hospitalAddress}
                  latitude={req.latitude}
                  longitude={req.longitude}
                  bloodGroup={req.patientBloodGroup}
                  commitments={req.commitments}
                  urgency={req.urgency}
                  donorEligibility={donor.eligibility}
                  onCommitmentChange={refetch}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function HistoryTab(props) {
  return <HistoryTabErrorBoundary {...props} />;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SHARED UI — stat card, skeleton, error banner
// ═══════════════════════════════════════════════════════════════════════════
function StatCard({ label, value, sub, icon, iconBg }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className="stat-card-icon" style={{ background: iconBg }}>
          <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        </div>
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-sub">{sub}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div className="skeleton" style={{ height: 40, width: 280, borderRadius: 8 }} />
      <div className="dashboard-grid-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 110, borderRadius: 16 }} />
        ))}
      </div>
      <div className="dashboard-grid-2">
        <div className="skeleton" style={{ height: 160, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 160, borderRadius: 16 }} />
      </div>
      <div className="skeleton" style={{ height: 180, borderRadius: 16 }} />
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div
      className="animate-fade-up"
      style={{
        padding: 'var(--space-5) var(--space-6)',
        background: 'rgba(192,57,43,0.08)',
        border: '1px solid rgba(192,57,43,0.2)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
      }}
    >
      <AlertCircle size={20} style={{ color: 'var(--red-400)', flexShrink: 0 }} />
      <span style={{ color: 'var(--red-300)', flex: 1 }}>{message}</span>
      <button className="btn btn-ghost btn-sm" onClick={onRetry}>Retry</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
function getTimeGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  return 'evening';
}

function formatDate(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date));
}

function daysSince(date) {
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
