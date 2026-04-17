import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

/* ─── Step Indicator ───────────────────────────────────── */
const StepBar = ({ current }) => {
  const steps = [
    { n: 1, label: 'Company' },
    { n: 2, label: 'Security' },
    { n: 3, label: 'Activate' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '0' }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.9rem',
              background: current >= s.n
                ? 'var(--brand-primary)'
                : 'rgba(255,255,255,0.07)',
              color: current >= s.n ? 'white' : 'var(--text-secondary)',
              border: current === s.n ? '2px solid var(--brand-primary)' : '2px solid transparent',
              transition: 'all 0.3s',
            }}>
              {current > s.n ? '✓' : s.n}
            </div>
            <span style={{
              fontSize: '0.72rem', marginTop: '0.35rem',
              color: current >= s.n ? 'var(--brand-primary)' : 'var(--text-secondary)',
              fontWeight: current === s.n ? 600 : 400,
            }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: '2px', marginBottom: '1.2rem',
              background: current > s.n
                ? 'var(--brand-primary)'
                : 'rgba(255,255,255,0.1)',
              transition: 'background 0.4s',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

/* ─── Password Strength ────────────────────────────────── */
const getStrength = (pw) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};
const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

/* ─── Main Signup Component ────────────────────────────── */
const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    company_name: '',
    plan: 'starter',
    username: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const PLAN_INFO = {
    starter:    { price: '₹99/mo',  users: '5 Users',    storage: '50 GB' },
    growth:     { price: '₹299/mo', users: '20 Users',   storage: '500 GB' },
    enterprise: { price: '₹999/mo', users: '100 Users',  storage: '2 TB' },
  };

  const pw = formData.password;
  const strength = getStrength(pw);

  const validateStep1 = () => {
    if (!formData.company_name.trim()) return 'Company name is required.';
    if (!formData.username.trim()) return 'Username is required.';
    if (formData.username.length < 3) return 'Username must be at least 3 characters.';
    return null;
  };

  const validateStep2 = () => {
    if (!formData.email.trim()) return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Enter a valid email address.';
    if (formData.password.length < 6) return 'Password must be at least 6 characters.';
    if (formData.password !== formData.confirm_password) return 'Passwords do not match.';
    return null;
  };

  const goNext = () => {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) return setError(err);
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setError(null);
    const err = validateStep2();
    if (err) return setError(err);

    setLoading(true);
    try {
      const { confirm_password, ...payload } = formData;
      await api.post('/auth/register/', payload);
      navigate('/login', {
        state: { message: '🎉 Workspace created! Log in to complete your activation payment.' }
      });
    } catch (err) {
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') setError(data);
        else if (data.detail) setError(data.detail);
        else setError(Object.values(data).flat()[0] || 'Registration failed.');
      } else {
        setError('A network error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const set = (field, val) => setFormData(f => ({ ...f, [field]: val }));

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card" style={{ maxWidth: '480px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.6rem' }}>
            {step === 1 ? '🏢 Create your Workspace' : step === 2 ? '🔐 Secure your Account' : '🚀 Ready to Launch'}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            {step === 1 ? 'Start your company's isolated SaaS environment.' :
             step === 2 ? 'Set your admin credentials. Keep your password safe.' :
             'Review your plan and complete your first payment to activate.'}
          </p>
        </div>

        <StepBar current={step} />

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* ── STEP 1: Company & Username ── */}
        {step === 1 && (
          <div>
            <div className="input-group">
              <label className="input-label">Company Name</label>
              <input
                type="text" className="form-input"
                placeholder="e.g. UserSurf Inc."
                value={formData.company_name}
                onChange={e => set('company_name', e.target.value)}
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="input-label">Admin Username</label>
              <input
                type="text" className="form-input"
                placeholder="e.g. surf_admin"
                value={formData.username}
                onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g, '_'))}
              />
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                This will be your login handle. No spaces allowed.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">Subscription Plan</label>
              <select className="form-input form-select"
                value={formData.plan}
                onChange={e => set('plan', e.target.value)}>
                <option value="starter">Starter — 5 Users · 50 GB · ₹99/mo</option>
                <option value="growth">Growth — 20 Users · 500 GB · ₹299/mo</option>
                <option value="enterprise">Enterprise — 100 Users · 2 TB · ₹999/mo</option>
              </select>
            </div>

            {/* Plan preview badge */}
            <div style={{
              display: 'flex', gap: '1rem', padding: '0.85rem 1rem',
              background: 'rgba(99,102,241,0.08)', borderRadius: '10px',
              border: '1px solid rgba(99,102,241,0.2)', marginBottom: '1.25rem',
            }}>
              {Object.entries(PLAN_INFO[formData.plan]).map(([k, v]) => (
                <div key={k} style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--brand-primary)', fontSize: '1rem' }}>{v}</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{k.replace('_', ' ')}</p>
                </div>
              ))}
            </div>

            <button className="btn btn-primary btn-block" onClick={goNext}>
              Next — Set Password →
            </button>
          </div>
        )}

        {/* ── STEP 2: Email + Password + Confirm ── */}
        {step === 2 && (
          <div>
            <div className="input-group">
              <label className="input-label">Admin Email</label>
              <input
                type="email" className="form-input"
                placeholder="admin@yourcompany.com"
                value={formData.email}
                onChange={e => set('email', e.target.value)}
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                type="password" className="form-input"
                placeholder="Min. 6 characters"
                value={formData.password}
                onChange={e => set('password', e.target.value)}
              />
              {/* Strength bar */}
              {pw && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: '4px', borderRadius: '2px',
                        background: strength >= i ? strengthColor[strength] : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.3s',
                      }} />
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: strengthColor[strength] }}>
                    {strengthLabel[strength]}
                  </p>
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <input
                type="password" className="form-input"
                placeholder="Retype your password"
                value={formData.confirm_password}
                onChange={e => set('confirm_password', e.target.value)}
              />
              {formData.confirm_password && (
                <p style={{
                  margin: '0.35rem 0 0', fontSize: '0.78rem',
                  color: formData.password === formData.confirm_password ? '#10b981' : '#ef4444'
                }}>
                  {formData.password === formData.confirm_password ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setStep(1); setError(null); }}>
                ← Back
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={loading}>
                {loading ? <><span className="loader" style={{ width: 16, height: 16, borderWidth: 2 }}></span> Creating...</> : '🚀 Launch Workspace'}
              </button>
            </div>
          </div>
        )}

        <p style={{ marginTop: '1.5rem', textAlign: 'center', marginBottom: 0, fontSize: '0.88rem' }}>
          Already have a workspace? <Link to="/login" className="text-link">Log in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
