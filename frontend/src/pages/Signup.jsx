import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { 
  Shield, Building2, User, Mail, Lock, 
  CheckCircle2, ArrowRight, ArrowLeft, Zap, Sparkles 
} from 'lucide-react';

/* ─── Step Indicator ───────────────────────────────────── */
const StepBar = ({ current }) => {
  const steps = [
    { n: 1, label: 'Company', icon: Building2 },
    { n: 2, label: 'Account', icon: User },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2.5rem', gap: '0.5rem' }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: i === 0 ? 'none' : 1 }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: current >= s.n ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              color: current >= s.n ? 'white' : 'var(--text-tertiary)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: current === s.n ? '0 0 15px rgba(99,102,241,0.3)' : 'none'
            }}>
              {current > s.n ? <CheckCircle2 size={18} /> : <s.icon size={16} />}
            </div>
            <span style={{
              fontSize: '0.85rem', fontWeight: 600,
              color: current >= s.n ? 'var(--text-primary)' : 'var(--text-tertiary)'
            }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: '2px', margin: '0 0.5rem',
              background: current > s.n ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
              borderRadius: '2px'
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
const strengthColor = ['', '#ef4444', '#f59e0b', '#60a5fa', '#10b981'];

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
    starter:    { price: '$29',  users: '5 Users',    storage: '50 GB' },
    growth:     { price: '$79', users: '20 Users',   storage: '500 GB' },
    enterprise: { price: '$999', users: '100 Users',  storage: '2 TB' },
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
    <div style={{ 
      minHeight: '100vh', background: 'var(--bg-base)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Background Decorative Elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', zIndex: 0 }} />

      <div className="tv-card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', position: 'relative', zIndex: 1, boxShadow: '0 32px 64px rgba(0,0,0,0.4)' }}>
        
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', justifyContent: 'center' }}>
          <div className="tv-logo-icon" style={{ width: '36px', height: '36px' }}><Shield size={20} /></div>
          <span className="tv-logo-text" style={{ fontSize: '1.25rem' }}>TenantVault</span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {step === 1 ? 'Create your Workspace' : 'Secure your Account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {step === 1 ? 'Start your isolated enterprise environment' : 'Set your admin credentials'}
          </p>
        </div>

        <StepBar current={step} />

        {error && <div className="tv-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

        {/* ── STEP 1: Company & Plan ── */}
        {step === 1 && (
          <div className="animate-in">
            <div className="tv-input-group">
              <label className="tv-label">Company Name</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type="text" className="tv-input" style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. Acme Corporation"
                  value={formData.company_name}
                  onChange={e => set('company_name', e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="tv-input-group">
              <label className="tv-label">Admin Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type="text" className="tv-input" style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. admin_jane"
                  value={formData.username}
                  onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g, '_'))}
                />
              </div>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>No spaces allowed.</p>
            </div>

            <div className="tv-input-group">
              <label className="tv-label">Subscription Plan</label>
              <select className="tv-input tv-select"
                value={formData.plan}
                onChange={e => set('plan', e.target.value)}>
                <option value="starter">Starter — {PLAN_INFO.starter.price}/mo</option>
                <option value="growth">Growth — {PLAN_INFO.growth.price}/mo</option>
                <option value="enterprise">Enterprise — {PLAN_INFO.enterprise.price}/mo</option>
              </select>
            </div>

            <div style={{
              display: 'flex', gap: '0.75rem', padding: '1rem',
              background: 'rgba(99,102,241,0.06)', borderRadius: '12px',
              border: '1px solid rgba(99,102,241,0.15)', marginBottom: '1.5rem',
            }}>
              {Object.entries(PLAN_INFO[formData.plan]).map(([k, v]) => (
                <div key={k} style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--accent)', fontSize: '0.95rem' }}>{v}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</p>
                </div>
              ))}
            </div>

            <button className="tv-btn tv-btn-primary tv-btn-block" onClick={goNext} style={{ padding: '0.75rem' }}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 2: Credentials ── */}
        {step === 2 && (
          <div className="animate-in">
            <div className="tv-input-group">
              <label className="tv-label">Admin Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type="email" className="tv-input" style={{ paddingLeft: '2.5rem' }}
                  placeholder="admin@company.com"
                  value={formData.email}
                  onChange={e => set('email', e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="tv-input-group">
              <label className="tv-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type="password" className="tv-input" style={{ paddingLeft: '2.5rem' }}
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={e => set('password', e.target.value)}
                />
              </div>
              {pw && (
                <div style={{ marginTop: '0.6rem' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: '3px', borderRadius: '2px',
                        background: strength >= i ? strengthColor[strength] : 'rgba(255,255,255,0.05)',
                        transition: 'all 0.4s'
                      }} />
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: strengthColor[strength] }}>
                    {strengthLabel[strength]} Security
                  </p>
                </div>
              )}
            </div>

            <div className="tv-input-group" style={{ marginBottom: '2rem' }}>
              <label className="tv-label">Confirm Password</label>
              <input
                type="password" className="tv-input"
                placeholder="Retype password"
                value={formData.confirm_password}
                onChange={e => set('confirm_password', e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="tv-btn tv-btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>
                <ArrowLeft size={16} />
              </button>
              <button className="tv-btn tv-btn-primary" style={{ flex: 3 }} onClick={handleSubmit} disabled={loading}>
                {loading ? <div className="tv-loader" /> : <><Sparkles size={16} /> Launch Workspace</>}
              </button>
            </div>
          </div>
        )}

        <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
          Already have a workspace? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
