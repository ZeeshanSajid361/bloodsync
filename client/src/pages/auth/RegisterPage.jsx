/**
 * Register page.
 *
 * Role selector, form validation, and a success state that prompts the user
 * to check their email before redirecting to login.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone, MapPin, AlertCircle, CheckCircle, Eye, EyeOff, RotateCw, Loader2 } from 'lucide-react';
import PhoneInput from '../../components/PhoneInput';
import api from '../../lib/api';
import '../../styles/auth.css';

const ROLES = [
  { id: 'donor',    label: 'Donor',    icon: '🩸' },
  { id: 'seeker',   label: 'Seeker',   icon: '🏥' },
  { id: 'hospital', label: 'Hospital', icon: '🏨' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', city: '', role: 'donor',
    // Donor-specific fields
    age: '', gender: 'male', bloodGroup: 'O+',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading,  setResendLoading]  = useState(false);
  const [resendMessage,  setResendMessage]  = useState('');

  useEffect(() => {
    // Pre-warm backend and Mongo connection while user is on the register page
    api.get('/health').catch(() => {});
  }, []);

  // Restore cooldown state from localStorage
  useEffect(() => {
    const ts = localStorage.getItem('bloodsync_verif_resend_ts');
    const em = localStorage.getItem('bloodsync_verif_resend_email');
    if (ts && em && form.email && em.toLowerCase() === form.email.toLowerCase()) {
      const elapsed = Math.floor((Date.now() - parseInt(ts, 10)) / 1000);
      if (elapsed < 60) {
        setResendCooldown(60 - elapsed);
      }
    }
  }, [form.email]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            localStorage.removeItem('bloodsync_verif_resend_ts');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleResendVerification() {
    if (resendLoading || resendCooldown > 0) return;
    setResendLoading(true);
    setResendMessage('');
    try {
      const { data } = await api.post('/auth/resend-verification', { email: form.email });
      localStorage.setItem('bloodsync_verif_resend_ts', Date.now().toString());
      localStorage.setItem('bloodsync_verif_resend_email', form.email);
      setResendCooldown(60);
      setResendMessage(data.message || 'Verification link re-sent!');
    } catch (err) {
      setResendMessage(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  }


  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  }

  function validate() {
    const e = {};
    if (!form.name.trim())                   e.name = 'Full name is required.';
    if (!form.email.trim())                  e.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.password)                      e.password = 'Password is required.';
    else if (form.password.length < 8)       e.password = 'Password must be at least 8 characters.';
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match.';

    if (form.role === 'donor') {
      if (!form.age)                         e.age = 'Age is required.';
      else if (Number(form.age) < 18)        e.age = 'Donors must be at least 18 years old.';
      else if (Number(form.age) > 65)        e.age = 'Donors must be 65 or younger.';
    }

    if (form.phone && !/^\+?\d{10,14}$/.test(form.phone.replace(/[\s-]/g, ''))) {
      e.phone = 'Enter a valid phone number (e.g. 03001234567 or +923001234567).';
    }

    return e;
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (loading) return;

    // Guard against synthetic auto-submits triggered by browser password save prompts
    if (e && e.type === 'submit' && e.nativeEvent && !e.nativeEvent.submitter && !e.isTrusted) {
      return;
    }

    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }

    setLoading(true);
    setApiError('');

    try {
      await api.post('/auth/register', {
        name:        form.name,
        email:       form.email,
        password:    form.password,
        role:        form.role,
        phone:       form.phone || undefined,
        city:        form.city  || undefined,
        // Donor-specific (ignored by server for non-donor roles)
        ...(form.role === 'donor' && {
          age:        Number(form.age),
          gender:     form.gender,
          bloodGroup: form.bloodGroup,
        }),
      });
      setSuccess(true);
    } catch (err) {
      setApiError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-layout">
        <BrandPanel />
        <div className="auth-form-panel">
          <div className="auth-form-card text-center animate-fade-up">
            <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-5)' }}>📬</div>
            <h1 style={{ fontSize: '1.75rem' }}>Check your inbox</h1>
            <p style={{ marginTop: 'var(--space-3)', maxWidth: 340, margin: 'var(--space-3) auto 0' }}>
              We sent a verification link to <strong style={{ color: 'var(--text-primary)' }}>{form.email}</strong>.
              <br />
              <span style={{ fontSize: '0.8rem', color: 'var(--red-300)', fontWeight: 600, display: 'inline-block', marginTop: '6px' }}>
                ⏱️ Link is valid for 2 hours. Any new request invalidates previous links.
              </span>
            </p>

            {resendMessage && (
              <p style={{ marginTop: 'var(--space-3)', fontSize: '0.85rem', color: resendMessage.includes('Failed') ? 'var(--red-400)' : 'var(--color-success)' }}>
                {resendMessage}
              </p>
            )}

            <button
              className="btn btn-primary btn-full mt-6"
              onClick={() => navigate('/login')}
            >
              Back to Sign In
            </button>

            <div className="auth-form-footer" style={{ marginTop: 'var(--space-4)' }}>
              Didn&apos;t receive it?{' '}
              <button
                className="btn btn-ghost btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0 4px', border: 'none', color: 'var(--red-400)' }}
                disabled={resendLoading || resendCooldown > 0}
                onClick={handleResendVerification}
              >
                {resendLoading ? (
                  <Loader2 size={13} className="spin" />
                ) : resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  <><RotateCw size={13} /> Resend verification email</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="auth-layout">
      <BrandPanel />

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h1>Create account</h1>
            <p>Join BloodSync and make a difference.</p>
          </div>

          {/* Role selector */}
          <div className="role-grid">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                id={`role-${r.id}`}
                className={`role-card${form.role === r.id ? ' selected' : ''}`}
                onClick={() => setForm((p) => ({ ...p, role: r.id }))}
              >
                <span className="role-card-icon">{r.icon}</span>
                <span className="role-card-label">{r.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-4">
              {/* Name */}
              <div className="input-group">
                <label className="input-label" htmlFor="reg-name">
                  Full name <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <input
                    id="reg-name"
                    name="name"
                    className={`input has-icon${errors.name ? ' error' : ''}`}
                    placeholder="Zeeshan Sajid"
                    value={form.name}
                    onChange={handleChange}
                    autoComplete="name"
                  />
                </div>
                {errors.name && <span className="input-error-msg"><AlertCircle size={13} />{errors.name}</span>}
              </div>

              {/* Email */}
              <div className="input-group">
                <label className="input-label" htmlFor="reg-email">
                  Email <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    className={`input has-icon${errors.email ? ' error' : ''}`}
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <span className="input-error-msg"><AlertCircle size={13} />{errors.email}</span>}
              </div>

              {/* Password */}
              <div className="input-group">
                <label className="input-label" htmlFor="reg-password">
                  Password <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    id="reg-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`input has-icon${errors.password ? ' error' : ''}`}
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      zIndex: 10,
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="input-error-msg"><AlertCircle size={13} />{errors.password}</span>}
              </div>

              {/* Confirm password */}
              <div className="input-group">
                <label className="input-label" htmlFor="reg-confirm">
                  Confirm password <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    id="reg-confirm"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`input has-icon${errors.confirmPassword ? ' error' : ''}`}
                    placeholder="Repeat your password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      zIndex: 10,
                    }}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <span className="input-error-msg"><AlertCircle size={13} />{errors.confirmPassword}</span>}
              </div>

              {/* Phone */}
              <div className="input-group w-full">
                <label className="input-label" htmlFor="reg-phone">Phone</label>
                <div className="input-wrapper" style={{ display: 'block' }}>
                  <PhoneInput
                    value={form.phone}
                    onChange={handleChange}
                    name="phone"
                  />
                </div>
                {errors.phone && <span className="input-error-msg" style={{ marginTop: '4px', display: 'block' }}><AlertCircle size={13} />{errors.phone}</span>}
              </div>

              {/* City */}
              <div className="input-group w-full">
                <label className="input-label" htmlFor="reg-city">City</label>
                <div className="input-wrapper">
                  <MapPin className="input-icon" size={18} />
                  <input
                    id="reg-city"
                    name="city"
                    className="input has-icon"
                    placeholder="Islamabad"
                    value={form.city}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* ── Donor-specific fields ── */}
              {form.role === 'donor' && (
                <>
                  <div
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'rgba(192,57,43,0.06)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      color: 'var(--red-300)',
                      borderLeft: '2px solid var(--red-600)',
                    }}
                  >
                    🩸 Donor details — required for eligibility tracking
                  </div>

                  <div className="flex gap-4">
                    {/* Age */}
                    <div className="input-group w-full">
                      <label className="input-label" htmlFor="reg-age">
                        Age <span className="required">*</span>
                      </label>
                      <input
                        id="reg-age"
                        name="age"
                        type="number"
                        min={18}
                        max={65}
                        className={`input${errors.age ? ' error' : ''}`}
                        placeholder="22"
                        value={form.age}
                        onChange={handleChange}
                      />
                      {errors.age && <span className="input-error-msg"><AlertCircle size={13} />{errors.age}</span>}
                    </div>

                    {/* Gender */}
                    <div className="input-group w-full">
                      <label className="input-label" htmlFor="reg-gender">
                        Gender <span className="required">*</span>
                      </label>
                      <select
                        id="reg-gender"
                        name="gender"
                        className="input"
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
                    <label className="input-label" htmlFor="reg-bloodGroup">
                      Blood group <span className="required">*</span>
                    </label>
                    <select
                      id="reg-bloodGroup"
                      name="bloodGroup"
                      className="input"
                      value={form.bloodGroup}
                      onChange={handleChange}
                    >
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* API error */}
            {apiError && (
              <div className="flex items-center gap-2 mt-4" style={{ color: 'var(--red-400)', fontSize: '0.875rem' }}>
                <AlertCircle size={16} />{apiError}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              className="btn btn-primary btn-full mt-6"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Create account'}
            </button>
          </form>

          <div className="auth-form-footer">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shared brand panel ───────────────────────────────────────────────────── */
function BrandPanel() {
  return (
    <aside className="auth-brand" aria-hidden="true">
      <div className="brand-logo-wrap">
        <div className="brand-icon">🩸</div>
        <div className="brand-wordmark">BloodSync</div>
        <p className="brand-tagline">Connecting donors, seekers, and hospitals across Pakistan.</p>
      </div>

      <div className="brand-stats">
        <div className="brand-stat">
          <span className="brand-stat-value">900+</span>
          <span className="brand-stat-label">Donors</span>
        </div>
        <div className="brand-stat">
          <span className="brand-stat-value">40+</span>
          <span className="brand-stat-label">Donations</span>
        </div>
        <div className="brand-stat">
          <span className="brand-stat-value">8</span>
          <span className="brand-stat-label">Blood types</span>
        </div>
      </div>

      <blockquote className="brand-quote">
        <p>"Every drop counts. One donation can save up to three lives."</p>
        <cite>— World Health Organisation</cite>
      </blockquote>
    </aside>
  );
}

export { BrandPanel };
