import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../api';

/* ─── Landing Page ─────────────────────────────────────── */
const LandingPage = ({ onGetStarted }) => (
  <div className="landing-root">
    {/* NAV */}
    <nav className="landing-nav">
      <div className="landing-logo">
        <span className="logo-icon">🏢</span>
        <span className="logo-text">TenantVault</span>
      </div>
      <div className="landing-nav-links">
        <a href="#features" className="nav-link">Features</a>
        <a href="#pricing" className="nav-link">Pricing</a>
        <button className="btn-nav-login" onClick={onGetStarted}>Sign In</button>
        <Link to="/register" className="btn-nav-cta">Get Started →</Link>
      </div>
    </nav>

    {/* HERO */}
    <section className="landing-hero">
      <div className="hero-badge">🔐 Encrypted · Real-time · Multi-Tenant</div>
      <h1 className="hero-title">
        The Secure Workspace<br />
        <span className="hero-gradient">Your Business Trusts</span>
      </h1>
      <p className="hero-subtitle">
        TenantVault gives your company an isolated, encrypted workspace with real-time collaboration,
        file versioning, and enterprise-grade security — all in one platform.
      </p>
      <div className="hero-actions">
        <Link to="/register" className="btn-hero-primary">Start Free Today →</Link>
        <button className="btn-hero-secondary" onClick={onGetStarted}>Sign In</button>
      </div>
      <div className="hero-stats">
        <div className="hero-stat"><span className="stat-val">AES-128</span><span className="stat-lbl">Encryption</span></div>
        <div className="hero-stat-divider" />
        <div className="hero-stat"><span className="stat-val">Real-Time</span><span className="stat-lbl">WebSockets</span></div>
        <div className="hero-stat-divider" />
        <div className="hero-stat"><span className="stat-val">100%</span><span className="stat-lbl">Data Isolated</span></div>
      </div>
    </section>

    {/* FEATURES */}
    <section className="landing-features" id="features">
      <h2 className="section-title">Everything your team needs</h2>
      <p className="section-sub">Built for companies that take security seriously.</p>
      <div className="features-grid">
        {[
          { icon: '🔐', title: 'Zero-Knowledge Encryption', desc: 'Files are encrypted server-side using AES-128 before they touch the disk. Only your team can read them.' },
          { icon: '⚡', title: 'Real-Time Collaboration', desc: 'Live document editing with cursor tracking. See your teammates type in real-time with WebSocket sync.' },
          { icon: '🏢', title: 'Complete Tenant Isolation', desc: 'Every company gets a fully isolated workspace. No data leaks between tenants — ever.' },
          { icon: '📄', title: 'File Versioning', desc: 'Roll back any document to a previous version instantly. Every change is tracked and stored securely.' },
          { icon: '📊', title: 'Usage Analytics', desc: 'Track storage usage, file views, and download counts across your entire organization.' },
          { icon: '💳', title: 'Flexible Billing', desc: 'Transparent storage-based billing with Starter, Growth, and Enterprise plans to fit any team.' },
        ].map((f) => (
          <div className="feature-card" key={f.title}>
            <div className="feature-icon">{f.icon}</div>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* PRICING */}
    <section className="landing-pricing" id="pricing">
      <h2 className="section-title">Simple, Transparent Pricing</h2>
      <p className="section-sub">No hidden fees. Scale as you grow.</p>
      <div className="pricing-grid">
        {[
          { name: 'Starter', price: '$29', period: '/mo', storage: '50 GB', users: '5 users', highlight: false },
          { name: 'Growth', price: '$79', period: '/mo', storage: '500 GB', users: '25 users', highlight: true },
          { name: 'Enterprise', price: 'Custom', period: '', storage: 'Unlimited', users: 'Unlimited', highlight: false },
        ].map((p) => (
          <div className={`pricing-card ${p.highlight ? 'pricing-highlight' : ''}`} key={p.name}>
            {p.highlight && <div className="pricing-badge">Most Popular</div>}
            <div className="pricing-name">{p.name}</div>
            <div className="pricing-price">{p.price}<span className="pricing-period">{p.period}</span></div>
            <ul className="pricing-features">
              <li>✅ {p.storage} Encrypted Storage</li>
              <li>✅ {p.users}</li>
              <li>✅ Real-Time Collaboration</li>
              <li>✅ File Versioning</li>
              {p.name === 'Enterprise' && <li>✅ Dedicated Support</li>}
            </ul>
            <Link to="/register" className={`btn-pricing ${p.highlight ? 'btn-pricing-primary' : 'btn-pricing-secondary'}`}>
              Get Started
            </Link>
          </div>
        ))}
      </div>
    </section>

    {/* FOOTER */}
    <footer className="landing-footer">
      <div className="footer-logo">
        <span className="logo-icon">🏢</span> TenantVault
      </div>
      <p className="footer-tagline">Enterprise-grade security. Built for teams.</p>
      <div className="footer-links">
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <Link to="/register">Sign Up</Link>
        <button onClick={onGetStarted}>Sign In</button>
      </div>
      <p className="footer-copy">© 2025 TenantVault. All rights reserved.</p>
    </footer>
  </div>
);

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-logo">🏢 <span>TenantVault</span></div>
        <h2 className="modal-title">Welcome back</h2>
        <p className="modal-sub">Sign in to access your secure workspace.</p>

        {successMsg && (
          <div className="error-message" style={{ background: 'rgba(16,185,129,0.1)', borderLeftColor: 'var(--accent-success)', color: 'var(--accent-success)' }}>
            {successMsg}
          </div>
        )}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Username</label>
            <input type="text" className="form-input" placeholder="Enter your username" required
              value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input type="password" className="form-input" placeholder="••••••••" required
              value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="loader" /> : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', marginBottom: 0, color: 'var(--text-secondary)' }}>
          Company not registered? <Link to="/register" className="text-link">Create a tenant</Link>
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
    // If redirected here from a protected page, show modal immediately
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
