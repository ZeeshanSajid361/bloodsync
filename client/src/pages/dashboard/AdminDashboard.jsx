/**
 * AdminDashboard — Phase 5
 * Tabs: Overview · Hospitals · Requests · Users
 */

import { useState, useEffect } from 'react';
import {
  ShieldCheck, Building2, FileText, Users, LogOut,
  CheckCircle, XCircle, Key, Lock, Unlock, ExternalLink,
  Loader2, AlertTriangle, TrendingUp, Menu, X, Trash2, HelpCircle,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import useAdminData from '../../hooks/useAdminData';
import useNotifications from '../../hooks/useNotifications';
import NotificationBell from '../../components/NotificationBell';
import AppSpotlightTour from '../../components/AppSpotlightTour';
import { getViewableDocUrl, isPdfUrl } from '../../lib/docUrl';
import '../../styles/dashboard.css';
import '../../styles/admin.css';

const ADMIN_TOUR_STEPS = [
  {
    targetSelector: '#nav-overview',
    title: 'Platform Analytics & Overview',
    description: 'System-wide oversight: total registered donors/seekers, blood request fulfillment rates, and low-stock hospital alerts across Pakistan!',
    icon: TrendingUp,
    preferredPos: 'right',
  },
  {
    targetSelector: '#nav-hospitals',
    title: 'Hospital & Partner Verification Queue',
    description: 'Review registration documents for hospitals and partner NGOs (PRCS, Edhi, Chhipa). Approve portal access or EMN API Keys!',
    icon: Building2,
    preferredPos: 'right',
  },
  {
    targetSelector: '#nav-requests',
    title: 'Emergency Request Verification',
    description: 'Verify seeker blood request hospital slips before broadcasting live push notifications to matching blood-group donors!',
    icon: FileText,
    preferredPos: 'right',
  },
  {
    targetSelector: '#nav-users',
    title: 'User Management & Security',
    description: 'View registered users, track verified donor contributions, monitor seeker fulfillment history, or block suspicious accounts!',
    icon: Users,
    preferredPos: 'right',
  },
];

/* ── shared note modal ───────────────────────────────────────────────────── */
function NoteModal({ title, description, onConfirm, onClose, loading, isReject }) {
  const [note, setNote] = useState('');
  return (
    <div className="admin-note-modal" onClick={onClose}>
      <div className="admin-note-dialog" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="input-label">{isReject ? 'Reason (required)' : 'Note (optional)'}</label>
          <textarea
            className="input"
            rows={3}
            style={{ resize: 'vertical' }}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={isReject ? 'Explain why this is being rejected…' : 'Optional message for the applicant…'}
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button
            className={`btn btn-sm ${isReject ? 'btn-danger' : 'btn-secondary'}`}
            disabled={loading || (isReject && !note.trim())}
            onClick={() => onConfirm(note)}
          >
            {loading ? <Loader2 size={15} className="spin" /> : isReject ? 'Reject' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── API key reveal modal ────────────────────────────────────────────────── */
function ApiKeyModal({ apiKey, orgName, onClose }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="admin-note-modal" onClick={onClose}>
      <div className="admin-note-dialog" onClick={e => e.stopPropagation()}>
        <h3>🔑 API Key Issued</h3>
        <p>
          Copy and share this key with <strong>{orgName}</strong>. It is shown
          only once and cannot be retrieved again.
        </p>
        <div style={{
          background: 'var(--surface-base)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          wordBreak: 'break-all',
          color: 'var(--blue-300)',
          marginBottom: 'var(--space-5)',
        }}>
          {apiKey}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={copy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

/* ══ OVERVIEW TAB ════════════════════════════════════════════════════════ */
function OverviewTab({ admin }) {
  const { fetchAnalytics, analytics, loading } = admin;

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading || !analytics) {
    return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--space-12)' }}><Loader2 size={28} className="spin" style={{ color: 'var(--red-400)' }} /></div>;
  }

  const { users, requests, organisations, inventory, recentRequests } = analytics;
  const byRole   = Object.fromEntries((users.byRole   || []).map(r => [r._id, r.count]));
  const byStatus = Object.fromEntries((requests.byStatus || []).map(r => [r._id, r.count]));

  return (
    <>
      <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {[
          { label: 'Total Users',        value: users.total,          sub: `${byRole.donor||0} donors · ${byRole.seeker||0} seekers` },
          { label: 'Blood Requests',     value: requests.total,       sub: `${byStatus.pending_review||0} pending review` },
          { label: 'Fulfilled Requests', value: byStatus.fulfilled||0,sub: 'successfully completed' },
          { label: 'Organisations',      value: organisations.total,  sub: `${(organisations.byStatus||[]).find(s=>s._id==='approved')?.count||0} approved` },
          { label: 'Total Units',        value: inventory.totalUnits, sub: 'across all hospitals' },
        ].map(({ label, value, sub }) => (
          <div className="admin-stat-card" key={label}>
            <div className="admin-stat-label">{label}</div>
            <div className="admin-stat-value">{value ?? '—'}</div>
            <div className="admin-stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      <div className="admin-overview-grid">
        {/* Low stock */}
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--red-400)' }}>
            <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} />
            Low Stock Alerts
          </h3>
          {inventory.lowStockItems?.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>All stock levels are adequate.</p>
            : <div className="low-stock-list">
                {inventory.lowStockItems?.slice(0, 6).map((item, i) => (
                  <div className="low-stock-row" key={i}>
                    <span className="blood-group-pill" style={{ fontSize: '0.75rem' }}>{item.bloodGroup}</span>
                    <span style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{item.hospitalName}</span>
                    <span style={{ color: item.units === 0 ? 'var(--red-400)' : 'var(--color-warning)', fontWeight: 700 }}>{item.units} units</span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Recent requests */}
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
            <TrendingUp size={16} style={{ display: 'inline', marginRight: 6 }} />
            Recent Requests
          </h3>
          <div className="admin-recent-requests-grid">
            {recentRequests?.map(r => (
              <div className="admin-recent-card" key={r._id}>
                <span className={`activity-dot ${r.urgency}`} style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', marginBottom: 'var(--space-2)', flexShrink: 0 }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.patientBloodGroup}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2, marginBottom: 'var(--space-2)' }}>{r.hospitalName}</div>
                <span className={`badge badge-${r.status === 'pending_review' ? 'amber' : r.status === 'approved' ? 'green' : 'gray'}`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                  {r.status.replace('_', ' ')}
                </span>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  · {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══ HOSPITALS TAB ═══════════════════════════════════════════════════════ */
function HospitalsTab({ admin }) {
  const { fetchHospitals, hospitals, approveHospital, rejectHospital, revokeApiKey, loading } = admin;
  const [filter,    setFilter]    = useState('pending');
  const [modal,     setModal]     = useState(null); // { type, org }
  const [acting,    setActing]    = useState(false);

  useEffect(() => { fetchHospitals(filter); }, [fetchHospitals, filter]);

  async function handleApprove(note) {
    setActing(true);
    try {
      await approveHospital(modal.org._id, note);
      setModal(null);
      fetchHospitals(filter);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    } finally { setActing(false); }
  }

  async function handleReject(note) {
    setActing(true);
    try {
      await rejectHospital(modal.org._id, note);
      setModal(null);
      fetchHospitals(filter);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    } finally { setActing(false); }
  }

  async function handleRevoke(org) {
    if (!window.confirm(`Revoke EMN API key for ${org.name}?`)) return;
    try {
      await revokeApiKey(org._id);
      fetchHospitals(filter);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke key.');
    }
  }

  const STATUS_FILTERS = ['pending', 'approved', 'rejected', ''];

  return (
    <>
      <div className="admin-table-wrap">
        <div className="admin-table-toolbar">
          <h3>Organisations ({hospitals.total})</h3>
          <div className="admin-filter-group">
            {STATUS_FILTERS.map(s => (
              <button key={s||'all'} className={`admin-filter-chip${filter===s?' active':''}`} onClick={() => setFilter(s)}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading
          ? <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}><Loader2 size={22} className="spin" /></div>
          : <table className="admin-table">
              <thead><tr><th>Name</th><th>Type</th><th>City</th><th>Owner</th><th>Document</th><th>API Key (EMN)</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {hospitals.orgs.length === 0
                  ? <tr><td colSpan={8} className="admin-empty">No organisations found.</td></tr>
                  : hospitals.orgs.map(org => (
                      <tr key={org._id}>
                        <td style={{ fontWeight: 600 }}>{org.name}</td>
                        <td>
                          {org.type === 'api_hospital' && <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>EMN API</span>}
                          {org.type === 'web_hospital' && <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>Web Hospital</span>}
                          {org.type === 'partner' && <span className="badge badge-purple" style={{ fontSize: '0.7rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>Partner</span>}
                          {!['api_hospital', 'web_hospital', 'partner'].includes(org.type) && <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{org.type}</span>}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{org.address?.city || '—'}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {org.owner?.name}<br /><span style={{ color: 'var(--text-muted)' }}>{org.owner?.email}</span>
                        </td>
                        <td>
                          {org.verificationDocumentUrls && org.verificationDocumentUrls.length > 0
                            ? <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {org.verificationDocumentUrls.map((url, i) => (
                                  <a key={i} className="doc-link" href={getViewableDocUrl(url)} target="_blank" rel="noreferrer">
                                    <ExternalLink size={13} /> {isPdfUrl(url) ? '📄 PDF' : '🖼 Doc'} {org.verificationDocumentUrls.length > 1 ? i+1 : ''}
                                  </a>
                                ))}
                              </div>
                            : (org.verificationDocumentUrl 
                                ? <a className="doc-link" href={getViewableDocUrl(org.verificationDocumentUrl)} target="_blank" rel="noreferrer">
                                    <ExternalLink size={13} /> {isPdfUrl(org.verificationDocumentUrl) ? '📄 View PDF' : '🖼 View Doc'}
                                  </a>
                                : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>)
                          }
                        </td>
                        <td>
                          {org.type === 'api_hospital' ? (
                            org.apiKeyPrefix ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                <span className="badge badge-blue" style={{ fontSize: '0.68rem', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <Key size={11} /> Active EMN Key
                                </span>
                                <span 
                                  style={{ 
                                    fontFamily: 'var(--font-mono)', 
                                    fontSize: '0.72rem', 
                                    color: '#60a5fa', 
                                    background: 'rgba(30, 58, 138, 0.25)', 
                                    padding: '2px 8px', 
                                    borderRadius: '4px', 
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    whiteSpace: 'nowrap'
                                  }} 
                                  title={`Active Key Prefix: ${org.apiKeyPrefix}`}
                                >
                                  {org.apiKeyPrefix}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Not Generated</span>
                            )
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>— (Web Access)</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-${org.status==='approved'?'green':org.status==='rejected'?'red':'amber'}`}>
                            {org.status}
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions" style={{ alignItems: 'center', gap: '8px' }}>
                            {org.status === 'pending' && (
                              <>
                                <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px' }} onClick={() => setModal({ type: 'approve', org })}>
                                  <CheckCircle size={13} /> Approve
                                </button>
                                <button className="btn btn-danger btn-sm" style={{ padding: '4px 10px' }} onClick={() => setModal({ type: 'reject', org })}>
                                  <XCircle size={13} /> Reject
                                </button>
                              </>
                            )}
                            {org.status === 'approved' && (
                              <>
                                <span style={{ color: '#34d399', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  ✓ Verified
                                </span>
                                {org.type === 'api_hospital' && org.apiKeyPrefix && (
                                  <button 
                                    className="btn btn-sm" 
                                    style={{ 
                                      padding: '4px 10px', 
                                      fontSize: '0.72rem',
                                      color: '#f87171', 
                                      background: 'rgba(239, 68, 68, 0.1)', 
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      borderRadius: 'var(--radius-md)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }} 
                                    onClick={() => handleRevoke(org)}
                                    title="Revoke active API key"
                                  >
                                    <Key size={12} /> Revoke Key
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
        }
      </div>

      {modal?.type === 'approve' && (
        <NoteModal
          title={`Approve "${modal.org.name}"`}
          description={
            modal.org.type === 'api_hospital'
              ? 'This will approve the EMN hospital account. The hospital will be able to generate their API Key from their Organisation Profile.'
              : 'This will activate the organisation account for web portal access.'
          }
          onConfirm={handleApprove} onClose={() => setModal(null)} loading={acting}
        />
      )}
      {modal?.type === 'reject' && (
        <NoteModal
          title={`Reject "${modal.org.name}"`}
          description="The applicant will see your reason. This action can be reversed by approving later."
          onConfirm={handleReject} onClose={() => setModal(null)} loading={acting} isReject
        />
      )}
    </>
  );
}

/* ══ REQUESTS TAB ════════════════════════════════════════════════════════ */
function RequestsTab({ admin }) {
  const { fetchRequests, requests, approveRequest, rejectRequest, fulfillRequest, loading } = admin;
  const [filter, setFilter] = useState('pending_review');
  const [modal,  setModal]  = useState(null);
  const [acting, setActing] = useState(false);

  useEffect(() => { fetchRequests(filter); }, [fetchRequests, filter]);

  async function handleAction(note) {
    setActing(true);
    try {
      if (modal.type === 'approve') await approveRequest(modal.req._id, note);
      if (modal.type === 'reject')  await rejectRequest(modal.req._id, note);
      if (modal.type === 'fulfill') await fulfillRequest(modal.req._id);
      setModal(null);
      fetchRequests(filter);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    } finally { setActing(false); }
  }

  const STATUS_FILTERS = ['pending_review', 'approved', 'rejected', 'fulfilled', ''];
  const URGENCY_COLOR  = { critical: 'badge-red', urgent: 'badge-amber', routine: 'badge-green' };

  return (
    <>
      <div className="admin-table-wrap">
        <div className="admin-table-toolbar">
          <h3>Blood Requests ({requests.total})</h3>
          <div className="admin-filter-group">
            {STATUS_FILTERS.map(s => (
              <button key={s||'all'} className={`admin-filter-chip${filter===s?' active':''}`} onClick={() => setFilter(s)}>
                {s ? s.replace('_',' ') : 'All'}
              </button>
            ))}
          </div>
        </div>

        {loading
          ? <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}><Loader2 size={22} className="spin" /></div>
          : <table className="admin-table">
              <thead><tr><th>Patient</th><th>Hospital</th><th>Units</th><th>Urgency</th><th>Document</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {requests.requests.length === 0
                  ? <tr><td colSpan={7} className="admin-empty">No requests found.</td></tr>
                  : requests.requests.map(r => (
                      <tr key={r._id}>
                        <td>
                          <strong>{r.patientBloodGroup}</strong>
                          {r.patientName && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.patientName}</div>}
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.seeker?.name} · {r.seeker?.city}</div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {r.hospitalName}<br /><span style={{ color: 'var(--text-muted)' }}>{r.hospitalCity}</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{r.unitsNeeded}</td>
                        <td><span className={`badge ${URGENCY_COLOR[r.urgency]}`}>{r.urgency}</span></td>
                        <td>
                          {r.documentUrls && r.documentUrls.length > 0
                            ? <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {r.documentUrls.map((url, i) => (
                                  <a key={i} className="doc-link" href={getViewableDocUrl(url)} target="_blank" rel="noreferrer">
                                    <ExternalLink size={13} /> {isPdfUrl(url) ? '📄 PDF' : '🖼 Slip'} {r.documentUrls.length > 1 ? i+1 : ''}
                                  </a>
                                ))}
                              </div>
                            : (r.documentUrl 
                                ? <a className="doc-link" href={getViewableDocUrl(r.documentUrl)} target="_blank" rel="noreferrer">
                                    <ExternalLink size={13} /> {isPdfUrl(r.documentUrl) ? '📄 View PDF' : '🖼 View Slip'}
                                  </a> 
                                : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>)
                          }
                        </td>
                        <td>
                          <span className={`badge badge-${r.status==='approved'?'green':r.status==='rejected'?'red':r.status==='fulfilled'?'blue':'amber'}`}>
                            {r.status.replace('_',' ')}
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions">
                            {r.status === 'pending_review' && <>
                              <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={() => setModal({ type: 'approve', req: r })}>
                                <CheckCircle size={13} />
                              </button>
                              <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => setModal({ type: 'reject', req: r })}>
                                <XCircle size={13} />
                              </button>
                            </>}
                            {r.status === 'approved' && (
                              <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={() => { setModal({ type: 'fulfill', req: r }); handleAction(); }}>
                                <CheckCircle size={13} /> Fulfilled
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
        }
      </div>

      {modal?.type === 'approve' && (
        <NoteModal
          title="Approve Request"
          description="The seeker will be notified that their request is approved and donors will be alerted in Phase 6."
          onConfirm={handleAction} onClose={() => setModal(null)} loading={acting}
        />
      )}
      {modal?.type === 'reject' && (
        <NoteModal
          title="Reject Request"
          description="The uploaded document will be deleted from Cloudinary. The seeker will see your reason."
          onConfirm={handleAction} onClose={() => setModal(null)} loading={acting} isReject
        />
      )}
    </>
  );
}

/* ══ USERS TAB ═══════════════════════════════════════════════════════════ */
function UsersTab({ admin }) {
  const { fetchUsers, users, toggleBlock, deleteUser, loading } = admin;
  const [roleFilter, setRoleFilter] = useState('');
  const [search,     setSearch]     = useState('');
  const [acting,     setActing]     = useState('');

  useEffect(() => { fetchUsers(roleFilter, search); }, [fetchUsers, roleFilter]);

  async function handleBlock(user) {
    setActing(user._id);
    try {
      await toggleBlock(user._id, !user.isBlocked);
      fetchUsers(roleFilter, search);
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    } finally { setActing(''); }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Are you sure you want to permanently delete user "${user.name}" (${user.email})? This action cannot be undone.`)) {
      return;
    }
    setActing(user._id);
    try {
      await deleteUser(user._id);
      fetchUsers(roleFilter, search);
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    } finally { setActing(''); }
  }

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    fetchUsers(roleFilter, val);
  }

  function handleSearchSubmit(e) {
    if (e) e.preventDefault();
    fetchUsers(roleFilter, search);
  }

  const ROLES = ['', 'donor', 'seeker', 'hospital', 'admin'];

  return (
    <div className="admin-table-wrap">
      <div className="admin-table-toolbar">
        <h3>Users ({users.total})</h3>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="admin-filter-group">
            {ROLES.map(r => (
              <button key={r||'all'} className={`admin-filter-chip${roleFilter===r?' active':''}`} onClick={() => setRoleFilter(r)}>
                {r || 'All'}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input className="input" style={{ height: '32px', padding: '0 var(--space-3)', fontSize: '0.85rem', width: 180 }}
              placeholder="Search name or email…" value={search} onChange={handleSearchChange} />
            <button type="submit" className="btn btn-ghost btn-sm">Search</button>
          </form>
        </div>
      </div>

      {loading
        ? <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}><Loader2 size={22} className="spin" /></div>
        : <table className="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Blood Group</th><th>City</th><th>Fulfillment & Requests Track</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users.users.length === 0
                ? <tr><td colSpan={8} className="admin-empty">No users found.</td></tr>
                : users.users.map(u => (
                    <tr key={u._id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                      <td><span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{u.role}</span></td>
                      <td>
                        {u.bloodGroup && u.bloodGroup !== '—' ? (
                          <span style={{
                            background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                            color: '#ffffff',
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            🩸 {u.bloodGroup}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.city || '—'}</td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {(() => {
                          const r = (u.role || '').toLowerCase();
                          if (r === 'hospital' || r === 'admin') {
                            return <span style={{ color: 'var(--text-muted)' }}>—</span>;
                          }
                          if (r === 'donor') {
                            return (
                              <div>
                                <div style={{ fontWeight: 700, color: '#34d399' }}>
                                  🩸 Donated: {u.stats?.confirmedDonations || 0} unit(s)
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Verified Blood Donations
                                </div>
                              </div>
                            );
                          }
                          if (r === 'seeker' && u.stats) {
                            return (
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                  Fulfilled: <span style={{ color: '#34d399' }}>{u.stats.fulfilledRequests || 0} reqs</span> ({u.stats.fulfilledUnits || 0} units)
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Pending: {u.stats.pendingRequests || 0} reqs ({u.stats.pendingUnits || 0} units) · Total: {u.stats.totalRequests || 0}
                                </div>
                              </div>
                            );
                          }
                          return <span style={{ color: 'var(--text-muted)' }}>—</span>;
                        })()}
                      </td>
                      <td>
                        <span className={`badge badge-${u.isBlocked ? 'red' : 'green'}`}>
                          {u.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                      <td>
                        {u.role !== 'admin' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className={`btn btn-sm ${u.isBlocked ? 'btn-secondary' : 'btn-ghost'}`}
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              disabled={acting === u._id}
                              onClick={() => handleBlock(u)}
                            >
                              {acting === u._id
                                ? <Loader2 size={13} className="spin" />
                                : u.isBlocked
                                  ? <><Unlock size={13} /> Unblock</>
                                  : <><Lock size={13} /> Block</>
                              }
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              disabled={acting === u._id}
                              onClick={() => handleDelete(u)}
                              title="Permanently delete user"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
      }
    </div>
  );
}


/* ══ MAIN DASHBOARD ══════════════════════════════════════════════════════ */
const TABS = [
  { id: 'overview',  label: 'Overview',   icon: TrendingUp },
  { id: 'hospitals', label: 'Hospitals',  icon: Building2  },
  { id: 'requests',  label: 'Requests',   icon: FileText   },
  { id: 'users',     label: 'Users',      icon: Users      },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]   = useState('overview');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const admin           = useAdminData();
  const notifs          = useNotifications();

  useEffect(() => {
    const hasSeen = localStorage.getItem('bloodsync_spotlight_tour_admin');
    if (!hasSeen) {
      const timer = setTimeout(() => setShowOnboarding(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  // Badge counts for sidebar
  const pendingHospitals = admin.hospitals.orgs.filter(o => o.status === 'pending').length;
  const pendingRequests  = admin.requests.requests.filter(r => r.status === 'pending_review').length;

  useEffect(() => {
    admin.fetchHospitals('pending');
    admin.fetchRequests('pending_review');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogoClick(e) {
    if (e) e.preventDefault();
    setTab('overview');
    if (window.scrollY > 30) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      admin.fetchAnalytics();
    }
  }

  return (
    <div className="dashboard-shell">
      {/* ── Desktop Collapsible Sidebar (72px → 250px on hover) ── */}
      <aside className="sidebar">
        <a href="/" className="sidebar-logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <div className="sidebar-logo-icon">
            <ShieldCheck size={18} />
          </div>
          <span className="sidebar-logo-text">Blood<span>Sync</span></span>
        </a>

        <div className="sidebar-user" id="admin-profile-card" onClick={() => setShowProfileModal(true)} style={{ cursor: 'pointer' }}>
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Navigation</div>
          {TABS.map(({ id, label, icon: Icon }) => {
            const hasNotification = (id === 'hospitals' && pendingHospitals > 0) || (id === 'requests' && pendingRequests > 0);
            return (
              <button
                key={id}
                id={`nav-${id}`}
                className={`sidebar-nav-link${tab === id ? ' active' : ''}`}
                onClick={() => setTab(id)}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} />
                  {hasNotification && (
                    <div style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: '50%', background: '#ef4444', border: '1px solid #0f172a', pointerEvents: 'none' }} />
                  )}
                </div>
                <span>
                  <span style={{ flex: 1 }}>{label}</span>
                  {id === 'hospitals' && pendingHospitals > 0 && <span className="admin-nav-badge">{pendingHospitals}</span>}
                  {id === 'requests'  && pendingRequests  > 0 && <span className="admin-nav-badge">{pendingRequests}</span>}
                </span>
              </button>
            );
          })}
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
          <button className="sidebar-nav-link" onClick={logout} style={{ color: 'var(--red-400)' }}>
            <LogOut size={20} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Wrapper ── */}
      <div className="dashboard-main-wrapper">
        {/* Mobile Sticky Top Header */}
        <header className="mobile-header">
          <div className="mobile-header-logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
            <div className="mobile-header-logo-icon">
              <ShieldCheck size={16} color="#fff" />
            </div>
            <div className="mobile-header-title">Blood<span>Sync</span></div>
          </div>

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
              aria-label="View admin profile"
            >
              {initials}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="dashboard-topbar animate-fade-up">
            <div>
              <h1 className="dashboard-page-title">
                {tab === 'overview'  && 'Platform Overview'}
                {tab === 'hospitals' && 'Hospital & Partner Verification'}
                {tab === 'requests'  && 'Blood Request Review Queue'}
                {tab === 'users'     && 'User Management'}
              </h1>
            </div>
          </div>

          {tab === 'overview'  && <OverviewTab  admin={admin} />}
          {tab === 'hospitals' && <HospitalsTab admin={admin} />}
          {tab === 'requests'  && <RequestsTab  admin={admin} />}
          {tab === 'users'     && <UsersTab     admin={admin} />}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-bottom-nav">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`mobile-nav-item${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Profile Modal ── */}
      {showProfileModal && (
        <div className="profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <button className="profile-modal-close" onClick={() => setShowProfileModal(false)}>
                <X size={18} />
              </button>
              <div className="profile-avatar-large">{initials}</div>
              <div className="profile-modal-name">{user?.name}</div>
              <div className="profile-modal-role">System Administrator</div>
            </div>

            <div className="profile-modal-body">
              <div className="profile-info-row">
                <span className="profile-info-label">Email</span>
                <span className="profile-info-val">{user?.email}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Pending Hospitals</span>
                <span className="profile-info-val">{pendingHospitals}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Pending Requests</span>
                <span className="profile-info-val">{pendingRequests}</span>
              </div>
            </div>

            <div className="profile-modal-actions">
              <button
                className="btn btn-secondary btn-full"
                style={{ marginBottom: 8 }}
                onClick={() => { setShowProfileModal(false); setShowOnboarding(true); }}
              >
                <HelpCircle size={18} /> Replay App Tour
              </button>
              <button
                className="btn btn-ghost btn-full"
                style={{ color: 'var(--red-400)' }}
                onClick={logout}
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
        onClose={() => {
          setShowOnboarding(false);
          setTab('overview');
        }}
        steps={ADMIN_TOUR_STEPS}
        tourKey="admin"
        onStepChange={(stepIndex) => {
          if (stepIndex === 0) setTab('overview');
          if (stepIndex === 1) setTab('hospitals');
          if (stepIndex === 2) setTab('requests');
          if (stepIndex === 3) setTab('users');
        }}
      />
    </div>
  );
}
