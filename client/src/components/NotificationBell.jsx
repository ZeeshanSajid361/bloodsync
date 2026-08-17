/**
 * NotificationBell — reusable bell icon with badge + slide-down panel + detail modal.
 *
 * Used in all four role dashboards (Donor, Seeker, Hospital, Admin).
 * Displays only unseen notifications in the dropdown.
 * Clicking a notification displays basic info, removes it from unseen, and moves it to history.
 * An 'X' clear button lets users directly dismiss notifications to history.
 */

import React, { useRef, useEffect, useState } from 'react';
import { Bell, X, CheckCheck, Loader2, Info, ArrowRight, UserCheck, ShieldAlert } from 'lucide-react';
import './NotificationBell.css';

const TYPE_ICON = {
  request_approved:  '✅',
  request_rejected:  '❌',
  request_fulfilled: '🎉',
  code_red:          '🚨',
  donor_needed:      '🩸',
  system:            'ℹ️',
};

function timeAgo(dateStr) {
  if (!dateStr) return 'just now';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getGoogleMapsUrl(notif) {
  if (!notif) return 'https://www.google.com/maps';

  // 1. Direct saved mapsUrl
  if (notif.mapsUrl) return notif.mapsUrl;

  // 2. Direct maps link stored in link property
  if (notif.link && (notif.link.includes('google.com/maps') || notif.link.includes('maps.app.goo.gl'))) {
    return notif.link;
  }

  // 3. Extract exact hospital name from message (e.g., 'at Pims hospital')
  const msg = notif.message || '';
  const atMatch = msg.match(/\bat\s+([A-Za-z0-9\s,&'-]+?)(?=\s*\(|\s*\.|\s*$)/i);
  if (atMatch && atMatch[1]) {
    const cleanHospitalName = atMatch[1].trim();
    if (cleanHospitalName.length > 2 && cleanHospitalName.length < 60) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanHospitalName)}`;
    }
  }

  // 4. Fallback search
  const fallbackQuery = notif.hospital || 'Hospital';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery)}`;
}

export default function NotificationBell({
  unreadCount, notifications, loading,
  panelOpen, togglePanel,
  markRead, markAllRead, dismiss,
}) {
  const panelRef = useRef(null);
  const [selectedNotif, setSelectedNotif] = useState(null);

  // Filter to show ONLY unseen / unread notifications in the dropdown panel
  const unseenNotifs = (notifications || []).filter(n => !n.isRead);

  // Close panel on outside click.
  useEffect(() => {
    if (!panelOpen) return;
    function handle(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        togglePanel();
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [panelOpen, togglePanel]);

  function handleNotifClick(n) {
    setSelectedNotif(n);
    markRead(n._id);
    dismiss(n._id);
  }

  function handleDismissSingle(e, id) {
    e.stopPropagation();
    markRead(id);
    dismiss(id);
  }

  return (
    <div className="notif-bell-wrap" ref={panelRef}>
      {/* Bell button */}
      <button
        className={`notif-bell-btn${unreadCount > 0 ? ' has-unread' : ''}`}
        onClick={togglePanel}
        aria-label={`Notifications${unreadCount ? ` — ${unreadCount} unread` : ''}`}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Panel */}
      {panelOpen && (
        <div className="notif-panel">
          {/* Header */}
          <div className="notif-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="notif-panel-title">Unseen Notifications</span>
              {unreadCount > 0 && (
                <span className="badge badge-red" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                  {unreadCount} New
                </span>
              )}
            </div>
            <div className="notif-panel-actions">
              <button className="notif-action-btn" onClick={togglePanel} title="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="notif-panel-body">
            {loading ? (
              <div className="notif-loading">
                <Loader2 size={20} className="spin" />
              </div>
            ) : unseenNotifs.length === 0 ? (
              <div className="notif-empty">
                <Bell size={28} style={{ opacity: 0.3 }} />
                <p>No unseen notifications</p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All notifications read & moved to history</span>
              </div>
            ) : (
              unseenNotifs.map(n => (
                <div
                  key={n._id}
                  className="notif-item unread"
                  onClick={() => handleNotifClick(n)}
                >
                  <span className="notif-type-icon">{TYPE_ICON[n.type] || '🩸'}</span>
                  <div className="notif-content">
                    <p className="notif-title">{n.title}</p>
                    <p className="notif-msg">{n.message}</p>
                    <span className="notif-time">{timeAgo(n.createdAt)} • Tap for details</span>
                  </div>
                  <button
                    className="notif-dismiss-btn"
                    onClick={e => handleDismissSingle(e, n._id)}
                    title="Dismiss notification"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Notification Detail Modal (Opens when clicking any notification item) ── */}
      {selectedNotif && (
        <div className="profile-modal-overlay" onClick={() => setSelectedNotif(null)}>
          <div className="profile-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="profile-modal-header" style={{ background: 'linear-gradient(135deg, rgba(192,57,43,0.3), rgba(15,21,32,0.95))' }}>
              <button className="profile-modal-close" onClick={() => setSelectedNotif(null)}>
                <X size={18} />
              </button>
              <div style={{ fontSize: '2.2rem', marginBottom: 'var(--space-2)' }}>
                {TYPE_ICON[selectedNotif.type] || '🩸'}
              </div>
              <div className="profile-modal-name">{selectedNotif.title}</div>
              <div className="profile-modal-role">Notification Details</div>
            </div>

            <div className="profile-modal-body">
              <div className="profile-info-row" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span className="profile-info-label">Message</span>
                <span className="profile-info-val" style={{ textAlign: 'right' }}>{selectedNotif.message}</span>
              </div>

              <div className="profile-info-row">
                <span className="profile-info-label">Received</span>
                <span className="profile-info-val">{timeAgo(selectedNotif.createdAt)}</span>
              </div>

              <div className="profile-info-row">
                <span className="profile-info-label">Status</span>
                <span className="badge badge-green">Moved to History</span>
              </div>

              {/* Direct Google Maps Navigation Link */}
              <div style={{ marginTop: '8px' }}>
                <a
                  href={getGoogleMapsUrl(selectedNotif)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#60a5fa', background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                >
                  🗺️ Open Hospital Location on Google Maps
                </a>
              </div>

              <div style={{ marginTop: '12px', padding: 'var(--space-3)', background: 'rgba(52, 152, 219, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(52, 152, 219, 0.2)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ℹ️ All blood donations take place safely at the specified certified hospital facility.
              </div>
            </div>

            <div className="profile-modal-actions">
              <button className="btn btn-primary btn-full" onClick={() => setSelectedNotif(null)}>
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
