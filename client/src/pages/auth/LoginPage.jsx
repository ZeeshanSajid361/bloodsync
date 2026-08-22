/**
 * Login page.
 *
 * Authenticates the user and redirects to either the intended page (if they
 * were bounced from a protected route) or their role-specific dashboard.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { BrandPanel } from './RegisterPage';
import '../../styles/auth.css';

const ROLE_DASHBOARD = {
  donor:    '/dashboard/donor',
  seeker:   '/dashboard/seeker?tab=history',
  hospital: '/dashboard/hospital',
  admin:    '/dashboard/admin',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const redirectTo = location.state?.from?.pathname || null;

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Pre-warm backend health endpoint & pre-fetch dashboard chunks in background
    api.get('/health').catch(() => {});
    import('../dashboard/HospitalDashboard').catch(() => {});
    import('../dashboard/DonorDashboard').catch(() => {});
    import('../dashboard/SeekerDashboard').catch(() => {});
    import('../dashboard/AdminDashboard').catch(() => {});
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  }

  function validate() {
    const e = {};
    if (!form.email.trim())  e.email = 'Email is required.';
    if (!form.password)      e.password = 'Password is required.';
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
      const { data } = await api.post('/auth/login', {
        email:    form.email,
        password: form.password,
      });

      login(data.data);

      const destination = redirectTo || ROLE_DASHBOARD[data.data.user.role] || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      const code = err.response?.data?.code;

      if (code === 'EMAIL_NOT_VERIFIED') {
        setApiError('Your email is not verified. Check your inbox or request a new link.');
      } else if (code === 'ACCOUNT_BLOCKED') {
        setApiError('This account has been suspended. Please contact support.');
      } else {
        setApiError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      <BrandPanel />

      <div className="auth-form-panel">
        <div style={{ marginBottom: '16px', width: '100%', maxWidth: '440px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#94a3b8',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
          >
            <ArrowLeft size={16} /> Back to Homepage
          </Link>
        </div>

        <div className="auth-form-card">
          <div className="auth-form-header">
            <h1>Welcome back</h1>
            <p>Sign in to your BloodSync account.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-4">
              {/* Email */}
              <div className="input-group">
                <label className="input-label" htmlFor="login-email">
                  Email <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    id="login-email"
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label" htmlFor="login-password">
                    Password <span className="required">*</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    style={{ fontSize: '0.8125rem', color: 'var(--red-400)', transition: 'color var(--transition-fast)' }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`input has-icon${errors.password ? ' error' : ''}`}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
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
            </div>

            {/* API error */}
            {apiError && (
              <div className="flex items-center gap-2 mt-4" style={{ color: 'var(--red-400)', fontSize: '0.875rem' }}>
                <AlertCircle size={16} />
                <span>{apiError}</span>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-full mt-6"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Sign in'}
            </button>
          </form>

          <div className="auth-form-footer">
            Don&apos;t have an account?{' '}
            <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
