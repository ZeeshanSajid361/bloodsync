/**
 * HospitalDashboard — Phase 4
 *
 * Tabs:
 *   Overview   — org status, stock stats, low-stock alerts
 *   Inventory  — add/edit/delete blood group entries, Code Red broadcast
 *   Profile    — update org contact details
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2, DropletIcon, AlertTriangle, Settings,
  LogOut, Plus, Pencil, Trash2, Siren, X, Loader2,
  CheckCircle, Clock, MapPin, Phone, Mail, QrCode, ClipboardList, Camera, Upload, ChevronRight, Search,
  ExternalLink, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import useHospitalData from '../../hooks/useHospitalData';
import useNotifications from '../../hooks/useNotifications';
import NotificationBell from '../../components/NotificationBell';
import PhoneInput from '../../components/PhoneInput';
import LocationPickerModal from '../../components/LocationPickerModal';
import api from '../../lib/api';
import jsQR from 'jsqr';
import '../../styles/dashboard.css';
import '../../styles/hospital.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/* ── helpers ─────────────────────────────────────────────────────────────── */

function unitLevel(units, threshold) {
  if (units === 0)              return 'critical';
  if (units <= threshold)       return 'low';
  return 'good';
}

function formatExpiry(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isCodeRedLive(inv) {
  if (!inv.codeRed?.active) return false;
  if (!inv.codeRed.expiresAt) return false;
  return new Date() < new Date(inv.codeRed.expiresAt);
}

/* ── sub-components ──────────────────────────────────────────────────────── */

function PendingBanner() {
  return (
    <div className="pending-banner">
      <Clock size={20} />
      <div>
        <h4>Awaiting Admin Approval</h4>
        <p>
          Your organisation has been registered and is under review. You can
          update your profile while waiting, but inventory management will
          unlock once an admin approves your account.
        </p>
      </div>
    </div>
  );
}

function CodeRedModal({ inv, onConfirm, onClose, loading }) {
  const [msg, setMsg] = useState('');
  return (
    <div className="code-red-overlay" onClick={onClose}>
      <div className="code-red-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon"><Siren size={24} /></div>
        <h3>Issue Code Red — {inv.bloodGroup}</h3>
        <p>
          This broadcasts an urgent alert visible on the platform for 6 hours.
          Confirm only when stock is critically low and immediate donations are needed.
        </p>
        <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
          <label className="input-label">Custom message (optional)</label>
          <input
            className="input"
            placeholder={`Urgent: ${inv.bloodGroup} blood needed`}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onConfirm(inv._id, msg)}
            disabled={loading}
          >
            {loading ? <Loader2 size={15} className="spin" /> : 'Broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── tabs ────────────────────────────────────────────────────────────────── */

function OverviewTab({ profile }) {
  const { org, inventory = [] } = profile;
  const totalUnits = inventory.reduce((s, i) => s + i.units, 0);
  const lowCount   = inventory.filter(i => i.units <= i.lowStockThreshold).length;
  const codeReds   = inventory.filter(isCodeRedLive).length;

  return (
    <>
      {org.status === 'pending' && <PendingBanner />}

      {org.status === 'rejected' && (
        <div className="pending-banner" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', marginBottom: 'var(--space-5)' }}>
          <X size={20} style={{ color: 'var(--red-400)' }} />
          <div>
            <h4 style={{ color: 'var(--red-400)' }}>Registration Rejected</h4>
            <p>{org.adminNote ? `Reason: "${org.adminNote}"` : 'Your application was not approved by the admin.'}</p>
          </div>
        </div>
      )}

      <div className="hospital-stats">

        <div className="hospital-stat-card">
          <div className="stat-label">Total Units</div>
          <div className="stat-value">{totalUnits}</div>
          <div className="stat-sub">bags in stock</div>
        </div>
        <div className="hospital-stat-card">
          <div className="stat-label">Blood Types</div>
          <div className="stat-value">{inventory.length}</div>
          <div className="stat-sub">tracked</div>
        </div>
        <div className="hospital-stat-card">
          <div className="stat-label">Low Stock</div>
          <div className="stat-value" style={{ color: lowCount ? 'var(--color-warning)' : 'inherit' }}>
            {lowCount}
          </div>
          <div className="stat-sub">need attention</div>
        </div>
        <div className="hospital-stat-card">
          <div className="stat-label">Code Reds</div>
          <div className="stat-value" style={{ color: codeReds ? 'var(--red-400)' : 'inherit' }}>
            {codeReds}
          </div>
          <div className="stat-sub">active alerts</div>
        </div>
      </div>

      {lowCount > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--color-warning)' }}>
            ⚠️ Low Stock Alerts
          </h3>
          {inventory
            .filter(i => i.units <= i.lowStockThreshold)
            .map(i => {
              const codeRedActive = isCodeRedLive(i);
              return (
                <div key={i._id} className="pending-banner" style={{ marginBottom: 'var(--space-3)', background: codeRedActive ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.07)', border: `1px solid ${codeRedActive ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                  <AlertTriangle size={18} color={codeRedActive ? '#ef4444' : '#f59e0b'} />
                  <div>
                    <h4 style={{ color: codeRedActive ? '#ef4444' : 'var(--color-warning)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      {i.bloodGroup} — {i.units} units remaining
                      {codeRedActive && <span className="badge badge-red" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>🚨 CODE RED BROADCAST ACTIVE</span>}
                    </h4>
                    <p>
                      {codeRedActive
                        ? `Critical low stock (below threshold of ${i.lowStockThreshold}). Emergency Code Red alert is currently active and broadcasted to nearby donors.`
                        : `Stock is below threshold of ${i.lowStockThreshold}. You can broadcast an Emergency Code Red alert from the Inventory tab.`
                      }
                    </p>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Blood Group</th>
              <th>Units</th>
              <th>Expiry</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>
                No inventory entries yet. Go to the Inventory tab to add stock.
              </td></tr>
            ) : inventory.map(inv => {
              const level = unitLevel(inv.units, inv.lowStockThreshold);
              const pct   = Math.min(100, Math.round((inv.units / Math.max(inv.units, inv.lowStockThreshold * 4, 1)) * 100));
              return (
                <tr key={inv._id}>
                  <td><span className="blood-group-pill">{inv.bloodGroup}</span></td>
                  <td>
                    <div className="units-bar-wrap">
                      <div className="units-bar">
                        <div className={`units-bar-fill ${level}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="units-count">{inv.units}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{formatExpiry(inv.expiresAt)}</td>
                  <td>
                    {isCodeRedLive(inv)
                      ? <span className="code-red-badge"><span className="pulse-dot" />Code Red</span>
                      : <span className={`badge badge-${level === 'good' ? 'green' : level === 'low' ? 'amber' : 'red'}`}>
                          {level === 'good' ? 'Adequate' : level === 'low' ? 'Low' : 'Critical'}
                        </span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function InventoryTab({ profile, hooks }) {
  const { org, inventory = [] } = profile;
  const { saveInventory, updateInventory, removeInventory, issueCodeRed, cancelCodeRed } = hooks;

  const [form, setForm]                   = useState({ bloodGroup: '', units: '', expiresAt: '', lowStockThreshold: 2 });
  const [editId, setEditId]               = useState(null);
  const [saving, setSaving]               = useState(false);
  const [codeRedTarget, setCodeRedTarget] = useState(null);
  const [broadcasting, setBroadcasting]   = useState(false);

  function resetForm() {
    setForm({ bloodGroup: '', units: '', expiresAt: '', lowStockThreshold: 2 });
    setEditId(null);
  }

  function startEdit(inv) {
    setEditId(inv._id);
    setForm({
      bloodGroup:        inv.bloodGroup,
      units:             inv.units,
      expiresAt:         inv.expiresAt ? inv.expiresAt.slice(0, 10) : '',
      lowStockThreshold: inv.lowStockThreshold,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSave(e) {
    if (e) e.preventDefault();
    if (!form.bloodGroup) {
      toast.error('Please select a blood group from the dropdown.');
      return;
    }
    if (form.units === '' || isNaN(form.units) || Number(form.units) < 0) {
      toast.error('Please enter a valid number of units (0 or greater).');
      return;
    }

    const threshold = Number(form.lowStockThreshold || 2);

    // Rule 1: New stock batch units cannot be less than threshold
    if (!editId && Number(form.units) < threshold) {
      toast.error(`New stock batch units (${form.units}) must meet or exceed low stock threshold (min ${threshold} units).`);
      return;
    }

    // Rule 3: Expiry date cannot be in the past
    if (form.expiresAt) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (new Date(form.expiresAt) < todayStart) {
        toast.error('Expiry date cannot be in the past. Please select today or a future date.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        bloodGroup:        form.bloodGroup,
        units:             Number(form.units),
        expiresAt:         form.expiresAt || undefined,
        lowStockThreshold: threshold,
      };

      if (editId) {
        await updateInventory(editId, payload);
        if (payload.units <= threshold) {
          toast.success(`Batch for ${form.bloodGroup} updated to ${payload.units} units. Automatic Emergency Code Red alert activated!`);
        } else {
          toast.success(`Batch for ${form.bloodGroup} updated successfully!`);
        }
      } else {
        await saveInventory(payload);
        toast.success(`Added new batch of ${payload.units} units for ${form.bloodGroup}!`);
      }
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save inventory batch.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this blood batch entry?')) return;
    try {
      await removeInventory(id);
      toast.success('Batch entry removed.');
    } catch {
      toast.error('Failed to remove batch entry.');
    }
  }

  async function handleBroadcast(invId, message) {
    setBroadcasting(true);
    try {
      await issueCodeRed(invId, message);
      toast.success('Code Red broadcast issued!');
      setCodeRedTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue broadcast.');
    } finally {
      setBroadcasting(false);
    }
  }

  async function handleCancelRed(invId) {
    try {
      await cancelCodeRed(invId);
      toast.success('Code Red cancelled.');
    } catch {
      toast.error('Failed to cancel broadcast.');
    }
  }

  const isApproved = org.status === 'approved';

  // Compute aggregated unexpired totals for summary bar
  const now = new Date();
  const summaryMap = inventory.reduce((acc, item) => {
    const isExpired = item.expiresAt && new Date(item.expiresAt) < now;
    if (!isExpired && item.units > 0) {
      if (!acc[item.bloodGroup]) acc[item.bloodGroup] = { units: 0, batches: 0 };
      acc[item.bloodGroup].units += item.units;
      acc[item.bloodGroup].batches += 1;
    }
    return acc;
  }, {});

  return (
    <>
      {org?.type === 'api_hospital' && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: '20px', background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#60a5fa', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚡ Automated EMN API Stock Synchronization Active
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                This hospital is configured for Automated Enterprise Medical Network integration. Blood inventory updates sync in real-time from your Electronic Health Record (EHR/HIS) system via secure REST API.
              </div>
            </div>
            <span className="badge badge-blue" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
              API SYNC ENABLED
            </span>
          </div>
        </div>
      )}

      {!isApproved && <PendingBanner />}

      {isApproved && (
        <form className="inventory-form-card" onSubmit={handleSave}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ margin: 0 }}>{editId ? `Edit ${form.bloodGroup} Batch` : 'Add New Blood Stock Batch'}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Add multiple batches with different expiry dates. Unexpired batches are automatically summed for seekers.
            </span>
          </div>

          <div className="inventory-form-grid">
            <div className="input-group">
              <label className="input-label">Blood Group <span className="required">*</span></label>
              <select
                className="input"
                value={form.bloodGroup}
                onChange={e => setForm(p => ({ ...p, bloodGroup: e.target.value }))}
                disabled={!!editId}
              >
                <option value="">Select Blood Group…</option>
                {BLOOD_GROUPS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Batch Units <span className="required">*</span></label>
              <input
                type="number" min={0} className="input"
                value={form.units}
                onChange={e => setForm(p => ({ ...p, units: e.target.value }))}
                placeholder="e.g. 10"
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {!editId ? `New stock must be ≥ threshold (${form.lowStockThreshold || 2} units).` : 'Decreasing units below threshold triggers Code Red.'}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Batch Expiry Date</label>
              <input
                type="date" className="input"
                value={form.expiresAt}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Must be today or a future date.
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Low Stock Threshold</label>
              <input
                type="number" min={0} className="input"
                value={form.lowStockThreshold}
                onChange={e => setForm(p => ({ ...p, lowStockThreshold: e.target.value }))}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Automatic alert triggers when stock ≤ threshold.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving
                ? <Loader2 size={15} className="spin" />
                : <><Plus size={15} />{editId ? 'Update Batch' : 'Add New Batch'}</>
              }
            </button>
            {editId && <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      )}

      {/* Aggregated Total Stock Summary Header */}
      <div style={{
        margin: 'var(--space-4) 0',
        padding: '14px 18px',
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🩸 Total Unexpired Stock (Public View):
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.keys(summaryMap).length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No active stock available.</span>
          ) : (
            Object.entries(summaryMap).map(([bg, data]) => (
              <span key={bg} style={{
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.78rem',
                color: '#f8fafc'
              }}>
                <strong style={{ color: '#ef4444' }}>{bg}:</strong> {data.units} units ({data.batches} batch{data.batches > 1 ? 'es' : ''})
              </span>
            ))
          )}
        </div>
      </div>

      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Blood Group</th><th>Batch Units</th><th>Threshold</th><th>Expiry Date</th><th>Batch Status</th>
              {isApproved && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr><td colSpan={isApproved ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>
                No inventory batches added yet.
              </td></tr>
            ) : inventory.map(inv => {
              const live = isCodeRedLive(inv);
              const isExpired = inv.expiresAt && new Date(inv.expiresAt) < now;
              const daysLeft = inv.expiresAt ? Math.ceil((new Date(inv.expiresAt) - now) / (1000 * 60 * 60 * 24)) : null;
              const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
              const level = unitLevel(inv.units, inv.lowStockThreshold);

              return (
                <tr key={inv._id} style={{ opacity: isExpired ? 0.6 : 1 }}>
                  <td><span className="blood-group-pill">{inv.bloodGroup}</span></td>
                  <td><strong>{inv.units}</strong></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{inv.lowStockThreshold}</td>
                  <td style={{ color: isExpired ? 'var(--red-400)' : isExpiringSoon ? '#f59e0b' : 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {formatExpiry(inv.expiresAt)}
                  </td>
                  <td>
                    {live ? (
                      <span className="code-red-badge"><span className="pulse-dot" />Code Red</span>
                    ) : isExpired ? (
                      <span className="badge badge-red" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                        ❌ Expired (Hidden from Search)
                      </span>
                    ) : isExpiringSoon ? (
                      <span className="badge badge-amber" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
                        ⚠️ Expiring ({daysLeft}d left)
                      </span>
                    ) : (
                      <span className={`badge badge-${level === 'good' ? 'green' : level === 'low' ? 'amber' : 'red'}`}>
                        {level === 'good' ? 'OK' : level === 'low' ? 'Low' : 'Critical'}
                      </span>
                    )}
                  </td>
                  {isApproved && (
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                        <button title="Edit Batch" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} onClick={() => startEdit(inv)}>
                          <Pencil size={14} />
                        </button>
                        {live
                          ? <button title="Cancel Code Red" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--red-400)' }} onClick={() => handleCancelRed(inv._id)}>
                              <X size={14} />
                            </button>
                          : <button title="Issue Code Red" className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => setCodeRedTarget(inv)}>
                              <Siren size={14} />
                            </button>
                        }
                        <button title="Delete Batch" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--red-400)' }} onClick={() => handleDelete(inv._id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {codeRedTarget && (
        <CodeRedModal
          inv={codeRedTarget}
          loading={broadcasting}
          onConfirm={handleBroadcast}
          onClose={() => setCodeRedTarget(null)}
        />
      )}
    </>
  );
}

function ProfileTab({ profile, hooks }) {
  const { org } = profile;
  const { saveProfile } = hooks;

  const [form, setForm] = useState({
    name:      org.name              || '',
    city:      org.address?.city     || '',
    street:    org.address?.street   || '',
    province:  org.address?.province || '',
    mapsUrl:   org.address?.mapsUrl  || '',
    latitude:  org.address?.latitude  || null,
    longitude: org.address?.longitude || null,
    phone:     org.phone             || '',
    email:     org.email             || '',
  });
  const [saving, setSaving]             = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await saveProfile(form, true);
      toast.success('Profile updated successfully.', { id: 'profile-toast' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.', { id: 'profile-toast' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="hospital-profile-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Organisation Profile</h3>
      </div>

      {/* Account Type / EMN Integration Banner */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20, background: org.type === 'api_hospital' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.6)', border: `1px solid ${org.type === 'api_hospital' ? 'rgba(59, 130, 246, 0.3)' : 'var(--surface-border)'}`, borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: org.type === 'api_hospital' ? '#60a5fa' : '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
              {org.type === 'api_hospital' ? '⚡ Enterprise Medical Network (EMN Automated Sync)' : '🌐 Web Portal Hospital (Manual Management)'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4, maxWidth: 600 }}>
              {org.type === 'api_hospital'
                ? 'Your hospital is configured for Automated API Integration. Blood stock and check-ins sync directly with your Electronic Health Record (EHR/HIS) system via secure API key.'
                : 'Your hospital uses manual Web Portal management. Inventory units and donor QR check-ins are managed manually by hospital counter staff.'}
            </div>
          </div>
          <div className={`badge ${org.type === 'api_hospital' ? 'badge-blue' : 'badge-amber'}`} style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
            {org.type === 'api_hospital' ? '🔑 AUTOMATED API SYNC' : '✍️ MANUAL WEB PORTAL'}
          </div>
        </div>
      </div>

      <div className="profile-form-grid">
        {[
          { label: 'Organisation Name', key: 'name', icon: Building2 },
          { label: 'City',              key: 'city', icon: MapPin },
          { label: 'Street / Area',     key: 'street', icon: MapPin },
          { label: 'Province',          key: 'province', icon: MapPin },
          { label: 'Phone',             key: 'phone', icon: Phone },
          { label: 'Contact Email',     key: 'email', icon: Mail },
        ].map(({ label, key, icon: Icon }) => (
          <div className="input-group" key={key}>
            <label className="input-label">{label}</label>
            {key === 'phone' ? (
              <div className="input-wrapper" style={{ display: 'block' }}>
                <PhoneInput 
                  value={form[key]} 
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} 
                  name={key} 
                />
              </div>
            ) : (
              <div className="input-wrapper">
                <Icon className="input-icon" size={17} />
                <input
                  className="input has-icon"
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={label}
                />
              </div>
            )}
          </div>
        ))}

        {/* Interactive Location & Google Maps Pin */}
        <div className="input-group" style={{ gridColumn: '1 / -1' }}>
          <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🗺️ Exact Hospital Map Pin & Address</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowMapPicker(true)}
              style={{ fontSize: '0.78rem', color: '#60a5fa', padding: '3px 10px', background: 'rgba(37, 99, 235, 0.15)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}
            >
              📍 Pick or Detect Location on Map
            </button>
          </label>
          <div className="input-wrapper" style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <MapPin className="input-icon" size={17} />
              <input
                className="input has-icon"
                value={form.mapsUrl}
                onChange={e => setForm(p => ({ ...p, mapsUrl: e.target.value }))}
                placeholder="Paste Google Maps URL or click 'Pick or Detect Location on Map'"
              />
            </div>
            {form.mapsUrl && (
              <a
                href={form.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}
              >
                <ExternalLink size={14} /> Open Pin
              </a>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Allows blood seekers to navigate directly to your hospital gate on Google Maps.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
        <button className="btn btn-secondary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="spin" /> : 'Save Changes'}
        </button>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Status: <strong style={{ color: org.status === 'approved' ? 'var(--color-success)' : 'var(--color-warning)' }}>{org.status}</strong>
        </span>
      </div>

      {/* Interactive Location Picker Modal */}
      <LocationPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        initialLocation={{
          city:      form.city,
          street:    form.street,
          province:  form.province,
          mapsUrl:   form.mapsUrl,
          latitude:  form.latitude,
          longitude: form.longitude,
        }}
        onSelectLocation={(loc) => {
          setForm(p => ({
            ...p,
            city:      loc.city      || p.city,
            street:    loc.street    || p.street,
            province:  loc.province  || p.province,
            mapsUrl:   loc.mapsUrl   || p.mapsUrl,
            latitude:  loc.latitude  || p.latitude,
            longitude: loc.longitude || p.longitude,
          }));
        }}
      />
    </div>
  );
}

/* ── Registration form (shown before org exists) ─────────────────────────── */

function RegisterOrgForm({ onSave }) {
  const [form, setForm]                 = useState({ type: 'web_hospital', name: '', city: '', street: '', province: '', mapsUrl: '', phone: '', email: '' });
  const [files, setFiles]               = useState([]);
  const [saving, setSaving]             = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [error, setError]               = useState('');

  function handleDetectGps() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        setForm(p => ({ ...p, mapsUrl: url, latitude: lat, longitude: lng }));
        setDetecting(false);
        toast.success('Exact GPS Location Detected!');
      },
      (err) => {
        setDetecting(false);
        toast.error('Could not detect GPS location: ' + err.message);
      }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.city) return setError('Name and city are required.');
    
    if (form.phone && !/^\+?\d{10,14}$/.test(form.phone.replace(/[\s-]/g, ''))) {
      return setError('Please enter a valid phone number (e.g. 03001234567 or +923001234567).');
    }
    
    if (!files || files.length === 0) return setError('Verification document is required.');

    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, v);
      });
      files.forEach(f => fd.append('verificationDocuments', f));

      await onSave(fd, false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      const details = err.response?.data?.errors?.map(e => e.message).join(' | ');
      setError(details ? `${msg} (${details})` : msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="hospital-section-header">
        <h2>Register Your Organisation</h2>
        <p>Fill in your details below. An admin will review and approve your account before you can manage inventory.</p>
      </div>
      <div className="hospital-profile-card">
        <h3>Organisation Details</h3>
        {error && <div style={{ marginBottom: 'var(--space-4)', color: 'var(--red-400)', fontSize: '0.875rem' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="profile-form-grid">
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Organisation Type</label>
              <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <option value="web_hospital">🏥 Web Portal Hospital / Clinic (Manual Web Dashboard)</option>
                <option value="api_hospital">⚡ Enterprise Medical Network (Automated API Key Integration)</option>
                <option value="partner">🤝 Partner Organisation (PRCS, Edhi, University Society)</option>
              </select>
            </div>
            {[
              { label: 'Organisation Name *', key: 'name', span: true },
              { label: 'City *',              key: 'city' },
              { label: 'Street / Area',       key: 'street' },
              { label: 'Province',            key: 'province' },
              { label: 'Phone',               key: 'phone' },
              { label: 'Contact Email',       key: 'email' },
            ].map(({ label, key, span }) => (
              <div className="input-group" key={key} style={span ? { gridColumn: '1 / -1' } : {}}>
                <label className="input-label">{label}</label>
                {key === 'phone' ? (
                  <PhoneInput 
                    value={form[key]} 
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} 
                    name={key} 
                  />
                ) : (
                  <input className="input" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={label.replace(' *', '')} />
                )}
              </div>
            ))}

            {/* Exact Location & Google Maps Pin */}
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🗺️ Exact Hospital Map Pin & Address</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowMapPicker(true)}
                  style={{ fontSize: '0.78rem', color: '#60a5fa', padding: '3px 10px', background: 'rgba(37, 99, 235, 0.15)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                >
                  📍 Pick or Detect Location on Map
                </button>
              </label>
              <input
                className="input"
                value={form.mapsUrl}
                onChange={e => setForm(p => ({ ...p, mapsUrl: e.target.value }))}
                placeholder="Paste Google Maps URL or click 'Pick or Detect Location on Map'"
              />
            </div>
            
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Registration / Verification Documents (Max 3) *</label>
              
              <input 
                type="file" 
                className="input" 
                accept="image/*,.pdf"
                multiple
                onChange={e => {
                  const selected = Array.from(e.target.files);
                  if (selected.length > 3) {
                    setError('You can only upload a maximum of 3 documents.');
                    return;
                  }
                  setError('');
                  setFiles(selected);
                }}
                style={{ padding: '0.5rem' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Upload PMC certificate, Health Board License, or official registration proof.
              </p>
              
              {files.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      • {f.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button type="submit" className="btn btn-secondary mt-4" disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : 'Submit for Review'}
          </button>
        </form>

        {/* Location Picker Modal */}
        <LocationPickerModal
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          initialLocation={{
            city:      form.city,
            street:    form.street,
            province:  form.province,
            mapsUrl:   form.mapsUrl,
          }}
          onSelectLocation={(loc) => {
            setForm(p => ({
              ...p,
              city:      loc.city      || p.city,
              street:    loc.street    || p.street,
              province:  loc.province  || p.province,
              mapsUrl:   loc.mapsUrl   || p.mapsUrl,
              latitude:  loc.latitude  || p.latitude,
              longitude: loc.longitude || p.longitude,
            }));
          }}
        />
      </div>
    </div>
  );
}

function extractCleanToken(raw) {
  if (!raw) return '';
  let str = String(raw).trim();
  if (str.includes('/qr/verify/')) {
    str = str.split('/qr/verify/').pop().trim();
  }
  if (str.includes('/')) {
    const parts = str.split('/').filter(Boolean);
    str = parts[parts.length - 1].split('?')[0].trim();
  }
  const match = str.match(/([a-zA-Z0-9]{8})/);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }
  return str.slice(-8).toUpperCase();
}

function LiveCameraScannerModal({ onScan, onClose }) {
  const videoRef = useRef(null);
  const [camError, setCamError] = useState(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    let activeStream = null;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCamError('Camera API is not supported on this browser. Please use the "Upload QR Image" option.');
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(() => {});
          scanFrame();
        }
      })
      .catch((err) => {
        console.error('Camera access error:', err);
        setCamError('Unable to access webcam or camera permission was denied. Please allow camera access or upload a QR image file.');
      });

    function scanFrame() {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            const extracted = extractCleanToken(code.data);
            if (extracted) {
              toast.success(`Live QR Scanned! Token: ${extracted}`);
              onScan(extracted);
              if (activeStream) {
                activeStream.getTracks().forEach(t => t.stop());
              }
              return;
            }
          }
        } catch (e) {
          /* ignore frame scan errors */
        }
      }
      animFrameRef.current = requestAnimationFrame(scanFrame);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [onScan]);

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000, padding: '16px'
    }}>
      <div style={{
        background: '#151926', border: '1px solid #2d374e', borderRadius: '16px',
        maxWidth: 500, width: '100%', padding: '20px', color: '#f8fafc',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} color="#3b82f6" /> Live Webcam QR Scanner
          </h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>

        {camError ? (
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#f87171', fontSize: '0.9rem' }}>
            ⚠️ {camError}
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: 280, background: '#000', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', width: 200, height: 200, border: '3px dashed #3b82f6',
              borderRadius: '16px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
              pointerEvents: 'none'
            }} />
          </div>
        )}

        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close Scanner</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── tabs ────────────────────────────────────────────────────────────────── */

function RequestsTab({ onNavigateToHistory }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const fetchRequests = useCallback(() => {
    setLoading(true);
    api.get('/hospitals/requests')
      .then(res => setRequests(res.data?.data || []))
      .catch(err => console.error('Failed to load hospital requests:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleVerify(tokenToVerify) {
    const t = extractCleanToken(tokenToVerify || qrTokenInput);
    if (!t) return setVerifyError('Please enter a valid 8-character QR token code.');

    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const res = await api.post('/hospitals/verify-qr', { token: t });
      toast.success(res.data.message || 'Donation verified successfully!');
      setVerifyResult(res.data.data);
      setQrTokenInput('');
      fetchRequests();
    } catch (err) {
      setVerifyError(err.response?.data?.message || err.message || 'QR Verification failed.');
    } finally {
      setVerifying(false);
    }
  }

  const handleImageQR = (file) => {
    if (!file) return;
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            const extracted = extractCleanToken(code.data);
            toast.success(`QR Code Scanned! Token: ${extracted}`);
            setQrTokenInput(extracted);
            await handleVerify(extracted);
          } else {
            setVerifyError('Could not decode QR code from image. Please ensure the QR image is clear or enter the 8-character token manually.');
            setVerifying(false);
          }
        } catch (err) {
          setVerifyError('Failed to process image QR code.');
          setVerifying(false);
        }
      };
      img.onerror = () => {
        setVerifyError('Failed to load image file.');
        setVerifying(false);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {showCameraModal && (
        <LiveCameraScannerModal
          onClose={() => setShowCameraModal(false)}
          onScan={async (token) => {
            setShowCameraModal(false);
            setQrTokenInput(token);
            await handleVerify(token);
          }}
        />
      )}

      {/* Counter Verification Card */}
      <div className="card animate-fade-up" style={{ padding: 'var(--space-6)', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '10px', borderRadius: '12px', color: '#60a5fa' }}>
            <QrCode size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Hospital Counter QR Check-In</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Scan donor QR code image or enter their 8-character token code to verify donation and mark request as fulfilled.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 220, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}
            placeholder="Enter QR Token (e.g. A7B9X2Y4)"
            value={qrTokenInput}
            onChange={(e) => setQrTokenInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          />

          {/* Option 1: Live Camera Scanner */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowCameraModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}
          >
            <Camera size={16} /> Camera Scan
          </button>

          {/* Option 2: Upload QR Image File */}
          <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <Upload size={16} /> Upload QR Image
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleImageQR(e.target.files?.[0])}
            />
          </label>

          {/* Option 3: Manual Verification Submit */}
          <button
            className="btn btn-primary"
            onClick={() => handleVerify()}
            disabled={verifying || !qrTokenInput.trim()}
          >
            {verifying ? <Loader2 size={16} className="spin" /> : 'Confirm & Fulfill'}
          </button>
        </div>

        {verifyError && (
          <div style={{ marginTop: 'var(--space-3)', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem' }}>
            ⚠️ {verifyError}
          </div>
        )}

        {verifyResult && (
          <div style={{ marginTop: 'var(--space-3)', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', color: '#34d399', fontSize: '0.9rem' }}>
            {(() => {
              const rawName = verifyResult.donorName || verifyResult.donor?.name || 'Donor';
              const cleanDonorName = rawName.toLowerCase().startsWith('donor') ? rawName : `Donor ${rawName}`;
              return (
                <>
                  ✅ <strong>Donation Verified!</strong> <strong>{cleanDonorName}</strong> successfully donated <strong>{verifyResult.bloodGroup}</strong> blood. Request marked as fulfilled.
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Active Incoming Requests List */}
      {(() => {
        const activeRequests = requests.filter(r => r.status === 'approved');
        const pendingAdminRequests = requests.filter(r => r.status === 'pending_review');
        const historyRequests = requests.filter(r => ['fulfilled', 'cancelled', 'rejected'].includes(r.status));

        return (
          <>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚡ Active Check-In Queue ({activeRequests.length})
                </h3>
                <button className="btn btn-ghost btn-sm" onClick={fetchRequests}>Refresh</button>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />)}
                </div>
              ) : activeRequests.length === 0 ? (
                <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  🏥 No approved incoming requests open for donor check-in right now.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {activeRequests.map(req => {
                    const enRouteCount = (req.commitments || []).filter(c => c.status === 'en_route').length;
                    return (
                      <div key={req._id} className="card" style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderLeft: '4px solid #3b82f6' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ background: 'var(--red-900)', color: 'var(--red-200)', padding: '2px 8px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 800 }}>
                              {req.patientBloodGroup}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Request #{req._id.slice(-6)}</span>
                            <span className="badge badge-blue">
                              READY FOR CHECK-IN
                            </span>
                            {enRouteCount > 0 && (
                              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 700 }}>
                                🚗 {enRouteCount} Donor(s) En-Route
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Patient: {req.patientName || 'Anonymous'} · Units Needed: {req.unitsNeeded} · Urgency: {req.urgency.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Historical Audit Log Preview (Max 2 recent items) */}
            {historyRequests.length > 0 && (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📜 Recent History Log (Showing 2 of {historyRequests.length})
                  </h3>
                  {onNavigateToHistory && (
                    <button className="btn btn-secondary btn-sm" onClick={onNavigateToHistory} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                      View Full History Log ({historyRequests.length}) <ChevronRight size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {historyRequests.slice(0, 2).map(req => (
                    <div key={req._id} className="card" style={{ padding: 'var(--space-3) var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, opacity: 0.75, background: 'rgba(15, 23, 42, 0.6)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '1px 7px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 800 }}>
                            {req.patientBloodGroup}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Request #{req._id.slice(-6)}</span>
                          <span className={`badge ${req.status === 'fulfilled' ? 'badge-green' : 'badge-red'}`}>
                            {req.status.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Patient: {req.patientName || 'Anonymous'} · Units: {req.unitsNeeded} · Date: {new Date(req.updatedAt || req.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

/* ── HISTORY TAB ───────────────────────────────────────────────────────── */
function HistoryTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRequests = useCallback(() => {
    setLoading(true);
    api.get('/hospitals/requests')
      .then(res => setRequests(res.data?.data || []))
      .catch(err => console.error('Failed to load history requests:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const historyRequests = requests.filter(r => ['fulfilled', 'cancelled', 'rejected'].includes(r.status));
  const fulfilledCount = historyRequests.filter(r => r.status === 'fulfilled').length;
  const cancelledCount = historyRequests.filter(r => r.status === 'cancelled').length;
  const fulfilledUnits = historyRequests.filter(r => r.status === 'fulfilled').reduce((sum, r) => sum + (r.unitsNeeded || 1), 0);

  const filteredList = historyRequests.filter(r => {
    if (filter === 'fulfilled' && r.status !== 'fulfilled') return false;
    if (filter === 'cancelled' && !['cancelled', 'rejected'].includes(r.status)) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const patient = (r.patientName || '').toLowerCase();
      const bloodGroup = (r.patientBloodGroup || '').toLowerCase();
      const id = (r._id || '').toLowerCase();
      return patient.includes(q) || bloodGroup.includes(q) || id.includes(q);
    }

    return true;
  });

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Metrics Cards */}
      <div className="card" style={{
        padding: 'var(--space-5) var(--space-6)',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '16px'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Total History Log</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>{historyRequests.length} Records</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Fulfilled Requests</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981' }}>{fulfilledCount} Completed</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Blood Units Collected</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#60a5fa' }}>🩸 {fulfilledUnits} Units</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Cancelled Reqs</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f87171' }}>{cancelledCount} Cancelled</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>All ({historyRequests.length})</button>
          <button className={`btn btn-sm ${filter === 'fulfilled' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('fulfilled')}>Fulfilled ({fulfilledCount})</button>
          <button className={`btn btn-sm ${filter === 'cancelled' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('cancelled')}>Cancelled ({cancelledCount})</button>
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 34, width: 280, fontSize: '0.85rem' }}
            placeholder="Search Patient, ID, or Blood Group..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : filteredList.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
          📋 No historical records matching your filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredList.map(req => (
            <div key={req._id} className="card" style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: req.status === 'fulfilled' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: req.status === 'fulfilled' ? '#34d399' : '#f87171', padding: '2px 8px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 800 }}>
                    {req.patientBloodGroup}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>Request #{req._id.slice(-6)}</span>
                  <span className={`badge ${req.status === 'fulfilled' ? 'badge-green' : 'badge-red'}`}>
                    {req.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Patient: {req.patientName || 'Anonymous'} · Units: {req.unitsNeeded || 1} · Date: {new Date(req.updatedAt || req.createdAt).toLocaleString('en-PK')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── main dashboard ──────────────────────────────────────────────────────── */

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: DropletIcon },
  { id: 'requests',   label: 'Counter Check-In', icon: QrCode },
  { id: 'history',    label: 'History Log', icon: Clock },
  { id: 'inventory',  label: 'Inventory',  icon: Plus },
  { id: 'profile',    label: 'Profile',    icon: Settings },
];

export default function HospitalDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab]   = useState('overview');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const hookData = useHospitalData();
  const { profile, loading, error } = hookData;
  const notifs = useNotifications();

  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  async function handleLogout() {
    await logout();
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--blue-400)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', color: 'var(--red-400)' }}>
        {error}
      </div>
    );
  }

  const isApproved = profile?.org?.status === 'approved';

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

        <div className="sidebar-user" onClick={() => setShowProfileModal(true)} style={{ cursor: 'pointer' }}>
          <div className="sidebar-user-card">
            <div className="sidebar-avatar" style={{ background: 'linear-gradient(135deg, var(--blue-600), var(--blue-900))' }}>{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{profile?.org?.name || user?.name}</div>
              <div className="sidebar-user-role">
                {profile?.org?.type === 'web_hospital'
                  ? 'Web Portal Hospital'
                  : profile?.org?.type === 'api_hospital'
                  ? 'Enterprise Medical Network'
                  : profile?.org?.type === 'partner'
                  ? 'Partner Organisation'
                  : 'Hospital Portal'}
              </div>
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
                className={`sidebar-nav-link${tab === id ? ' active' : ''}`}
                style={{
                  ...(tab === id ? { background: 'rgba(21, 101, 192, 0.15)', color: 'var(--blue-300)' } : {}),
                  ...(isLocked ? { opacity: 0.65 } : {})
                }}
                onClick={() => {
                  if (isLocked) {
                    toast.error('Feature locked until hospital account is approved by Admin.', { id: 'lock-toast' });
                  }
                  setTab(id);
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
          <button className="sidebar-nav-link" onClick={handleLogout} style={{ color: 'var(--red-400)' }}>
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
            <div className="mobile-header-logo-icon" style={{ background: 'linear-gradient(135deg, var(--blue-600), var(--blue-800))' }}>
              <Building2 size={16} color="#fff" />
            </div>
            <div className="mobile-header-title">{profile?.org?.name || 'Hospital'}</div>
          </div>

          {/* User Avatar Pill */}
          <button
            className="user-avatar-pill"
            style={{ background: 'linear-gradient(135deg, var(--blue-600), var(--blue-900))' }}
            onClick={() => setShowProfileModal(true)}
            aria-label="View profile details"
          >
            {initials}
          </button>
        </header>

        {/* Main Content Area */}
        <main className="dashboard-main">
          {!profile ? (
            <RegisterOrgForm onSave={hookData.saveProfile} />
          ) : (
            <>
              <div className="dashboard-topbar animate-fade-up">
                <div>
                  <h1 className="dashboard-page-title">
                    {tab === 'overview'  && 'Dashboard Overview'}
                    {tab === 'requests'  && 'Counter Check-In & Requests'}
                    {tab === 'history'   && 'Fulfillment & Request History Log'}
                    {tab === 'inventory' && 'Blood Inventory'}
                    {tab === 'profile'   && 'Organisation Profile'}
                  </h1>
                </div>
              </div>
              {tab === 'overview'  && <OverviewTab  profile={profile} />}
              {tab === 'profile'   && <ProfileTab   profile={profile} hooks={hookData} />}
              
              {!isApproved && tab !== 'overview' && tab !== 'profile' ? (
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
                    Feature Locked — Awaiting Admin Approval
                  </h3>
                  <p style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 20px', fontSize: '0.88rem', lineHeight: 1.6 }}>
                    Counter Check-In, QR Verification, Request Fulfillment, History Logs, and Blood Inventory will automatically unlock once an Administrator verifies and approves your hospital registration.
                  </p>
                  <div className="badge badge-amber" style={{ fontSize: '0.82rem', padding: '8px 18px', borderRadius: 20, letterSpacing: '0.04em' }}>
                    STATUS: {profile?.org?.status === 'pending' ? '⏳ UNDER ADMIN REVIEW' : '❌ REGISTRATION REJECTED'}
                  </div>
                </div>
              ) : (
                <>
                  {tab === 'requests'  && <RequestsTab  onNavigateToHistory={() => setTab('history')} />}
                  {tab === 'history'   && <HistoryTab />}
                  {tab === 'inventory' && <InventoryTab profile={profile} hooks={hookData} />}
                </>
              )}
            </>
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-bottom-nav">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isLocked = !isApproved && id !== 'overview' && id !== 'profile';
            return (
              <button
                key={id}
                className={`mobile-nav-item${tab === id ? ' active' : ''}`}
                style={{
                  ...(tab === id ? { color: 'var(--blue-400)' } : {}),
                  ...(isLocked ? { opacity: 0.5 } : {})
                }}
                onClick={() => {
                  if (isLocked) {
                    toast.error('Feature locked until hospital account is approved by Admin.', { id: 'lock-toast' });
                  }
                  setTab(id);
                }}
              >
                <Icon size={22} />
                <span>{label} {isLocked ? '🔒' : ''}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Full Profile View Modal ── */}
      {showProfileModal && (
        <div className="profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header" style={{ background: 'linear-gradient(135deg, rgba(21, 101, 192, 0.25), rgba(15, 21, 32, 0.9))' }}>
              <button className="profile-modal-close" onClick={() => setShowProfileModal(false)}>
                <X size={18} />
              </button>
              <div className="profile-avatar-large" style={{ background: 'linear-gradient(135deg, var(--blue-600), var(--blue-900))' }}>
                {initials}
              </div>
              <div className="profile-modal-name">{profile?.org?.name || user?.name}</div>
              <div className="profile-modal-role">{profile?.org?.type === 'partner' ? 'Partner Organisation' : 'Hospital'}</div>
            </div>

            <div className="profile-modal-body">
              <div className="profile-info-row">
                <span className="profile-info-label">Status</span>
                <span className={`badge badge-${profile?.org?.status === 'approved' ? 'green' : profile?.org?.status === 'pending' ? 'amber' : 'red'}`}>
                  {profile?.org?.status || 'pending'}
                </span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">City</span>
                <span className="profile-info-val">{profile?.org?.address?.city || '—'}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Contact</span>
                <span className="profile-info-val">{user?.name}</span>
              </div>
            </div>

            <div className="profile-modal-actions">
              <button
                className="btn btn-primary btn-full"
                style={{ background: 'linear-gradient(135deg, var(--blue-600), var(--blue-800))' }}
                onClick={() => { setTab('profile'); setShowProfileModal(false); }}
              >
                <Settings size={18} /> Edit Organisation Profile
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
