import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../api';
import { 
  Shield, Lock, Zap, Building2, History, BarChart3, 
  CreditCard, Check, ArrowRight, Menu, X, LogIn
} from 'lucide-react';

/* ─── Landing Page ─────────────────────────────────────── */
const LandingPage = ({ onGetStarted }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="tv-landing-root" style={{ background: 'var(--bg-base)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* NAVIGATION */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        padding: scrolled ? '0.75rem 6%' : '1.25rem 6%',
        background: scrolled ? 'rgba(11, 17, 32, 0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="tv-logo-icon" style={{ width: '32px', height: '32px' }}><Shield size={18} /></div>
          <span className="tv-logo-text" style={{ fontSize: '1.25rem' }}>TenantVault</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{ display: 'flex', gap: '2rem' }} className="hide-mobile">
            <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Features</a>
            <a href="#pricing" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Pricing</a>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="tv-btn tv-btn-ghost" onClick={onGetStarted}>Sign In</button>
            <Link to="/register" className="tv-btn tv-btn-primary" style={{ textDecoration: 'none' }}>
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={{ 
        padding: '12rem 2rem 8rem', textAlign: 'center', position: 'relative',
        background: 'radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.15), transparent 70%)'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.4rem 1rem', borderRadius: '999px', background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)', color: 'var(--accent)',
            fontSize: '0.8rem', fontWeight: 600, marginBottom: '2rem'
          }}>
            <Lock size={12} /> Secure · Isolated · Enterprise-Ready
          </div>
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', fontWeight: 800, 
            lineHeight: 1.1, letterSpacing: '-0.04em', marginBottom: '1.5rem',
            color: 'var(--text-primary)'
          }}>
            The Secure Workspace <br />
            <span className="text-gradient">Your Business Trusts</span>
          </h1>
          <p style={{ 
            fontSize: '1.15rem', color: 'var(--text-secondary)', 
            maxWidth: '600px', margin: '0 auto 3rem', lineHeight: 1.6 
          }}>
            TenantVault provides isolated, encrypted environments for modern teams. 
            Real-time collaboration meets military-grade security.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/register" className="tv-btn tv-btn-primary" style={{ padding: '0.8rem 2.5rem', fontSize: '1rem', textDecoration: 'none' }}>
              Start Free Trial
            </Link>
            <button className="tv-btn tv-btn-secondary" onClick={onGetStarted} style={{ padding: '0.8rem 2.5rem', fontSize: '1rem' }}>
              View Demo
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" style={{ padding: '6rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Built for the modern enterprise</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Every feature designed with security and productivity in mind.</p>
        </div>
        <div className="tv-grid tv-grid-3">
          {[
            { icon: Lock, color: '#6366f1', title: 'Zero-Knowledge Encryption', desc: 'Every document is encrypted with its own AES-128 key before it leaves your device.' },
            { icon: Zap, color: '#f59e0b', title: 'Real-Time Collaboration', desc: 'Edit together with cursor tracking and instant state synchronization across the globe.' },
            { icon: Building2, color: '#06b6d4', title: 'Absolute Isolation', desc: 'Multi-tenant architecture ensures your data is strictly separated at every layer.' },
            { icon: History, color: '#8b5cf6', title: 'Immutable Versioning', desc: 'Track every change and roll back to any point in time with cryptographically verified history.' },
            { icon: BarChart3, color: '#10b981', title: 'Audit Analytics', desc: 'Complete visibility into how your files are being used, shared, and accessed by your team.' },
            { icon: CreditCard, color: '#f472b6', title: 'Transparent Billing', desc: 'Pay only for what you use. Flexible storage-based plans that grow with your organization.' },
          ].map((f, i) => (
            <div className="tv-card tv-card-glow" key={i} style={{ padding: '2rem' }}>
              <div style={{ 
                width: '44px', height: '44px', borderRadius: '12px', background: `${f.color}15`,
                color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.5rem'
              }}>
                <f.icon size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" style={{ padding: '6rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Simple, scalable pricing</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Choose the plan that fits your current team size.</p>
        </div>
        <div className="tv-grid tv-grid-3" style={{ alignItems: 'flex-start' }}>
          {[
            { name: 'Starter', price: '$29', storage: '50 GB', users: '5 Users', color: 'var(--text-secondary)' },
            { name: 'Growth', price: '$79', storage: '500 GB', users: '25 Users', color: 'var(--accent)', highlight: true },
            { name: 'Enterprise', price: 'Custom', storage: 'Unlimited', users: 'Unlimited', color: 'var(--accent-cyan)' },
          ].map((p, i) => (
            <div className="tv-card" key={i} style={{ 
              padding: '2.5rem 2rem', 
              border: p.highlight ? '1px solid var(--accent)' : '1px solid var(--border)',
              transform: p.highlight ? 'scale(1.05)' : 'none',
              zIndex: p.highlight ? 10 : 1
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{p.name}</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '1rem 0' }}>{p.price}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[p.storage + ' Storage', p.users, 'Real-time sync', 'AES-128 Guard'].map((feat, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <Check size={14} style={{ color: 'var(--success)' }} /> {feat}
                  </li>
                ))}
              </ul>
              <Link to="/register" className={`tv-btn ${p.highlight ? 'tv-btn-primary' : 'tv-btn-secondary'} tv-btn-block`} style={{ textDecoration: 'none' }}>
                Select {p.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ 
        padding: '4rem 6% 2rem', borderTop: '1px solid var(--border)',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div className="tv-logo-icon" style={{ width: '28px', height: '28px' }}><Shield size={16} /></div>
          <span className="tv-logo-text" style={{ fontSize: '1.1rem' }}>TenantVault</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '2rem' }}>
          © 2025 TenantVault Inc. All rights reserved. Built for secure teams.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem' }}>Privacy</a>
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem' }}>Terms</a>
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem' }}>Contact</a>
        </div>
      </footer>
    </div>
  );
};

/* ─── Login Modal ───────────────────────────────────────── */
const LoginModal = ({ onClose }) => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login/', formData);
      login(data.access, data.refresh, data.user);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data) {
        if (typeof err.response.data === 'string') setError(err.response.data);
        else if (err.response.data.detail) setError(err.response.data.detail);
        else setError(Object.values(err.response.data).flat()[0] || 'Invalid credentials.');
      } else {
        setError('Unable to connect to the server.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tv-modal-overlay" onClick={onClose}>
      <div className="tv-modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <button className="tv-modal-close" onClick={onClose}><X size={18} /></button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <div className="tv-logo-icon" style={{ width: '36px', height: '36px' }}><Shield size={20} /></div>
          <span className="tv-logo-text" style={{ fontSize: '1.2rem' }}>TenantVault</span>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome back</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Sign in to access your secure workspace.
        </p>

        {successMsg && <div className="tv-badge tv-badge-success" style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', borderRadius: '8px' }}>{successMsg}</div>}
        {error && <div className="tv-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="tv-input-group">
            <label className="tv-label">Username</label>
            <input type="text" className="tv-input" placeholder="Enter your username" required
              value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
          </div>
          <div className="tv-input-group">
            <label className="tv-label">Password</label>
            <input type="password" className="tv-input" placeholder="••••••••" required
              value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          </div>
          <button type="submit" className="tv-btn tv-btn-primary tv-btn-block" disabled={loading} style={{ marginTop: '1rem', padding: '0.75rem' }}>
            {loading ? <div className="tv-loader" /> : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        <p style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
          Company not registered? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Create a tenant</Link>
        </p>
      </div>
    </div>
  );
};

/* ─── Main Login Page Wrapper ───────────────────────────── */
const Login = () => {
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.showLogin) setShowModal(true);
  }, [location]);

  return (
    <>
      <LandingPage onGetStarted={() => setShowModal(true)} />
      {showModal && <LoginModal onClose={() => setShowModal(false)} />}
    </>
  );
};

export default Login;
