import React from 'react';
import { Link } from 'react-router-dom';

// ── SVG Icons ──────────────────────────────────────────────────────────────
const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const LockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const BarChartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
);
const CreditCardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

// ── Feature data ────────────────────────────────────────────────────────────
const features = [
  { icon: <ShieldIcon />, color: 'var(--brand-primary)', title: 'Zero-Knowledge Encryption', desc: 'Every file is AES-128 encrypted before storage. Even we cannot read your data.' },
  { icon: <UsersIcon />, color: 'var(--brand-secondary)', title: 'Real-Time Collaboration', desc: 'Multiple users can co-edit documents simultaneously with live cursor sync.' },
  { icon: <LockIcon />, color: 'var(--brand-success)', title: 'Complete Tenant Isolation', desc: 'Each company gets a completely isolated vault. Zero data leaks between tenants.' },
  { icon: <ClockIcon />, color: 'var(--brand-primary)', title: 'File Versioning', desc: 'Every upload creates a new version. Roll back to any previous state instantly.' },
  { icon: <BarChartIcon />, color: 'var(--brand-secondary)', title: 'Usage Analytics', desc: 'Track views, downloads, and edits per file. Understand how your team works.' },
  { icon: <CreditCardIcon />, color: 'var(--brand-success)', title: 'Flexible Billing', desc: 'Plans from ₹299/mo. Scale up as your team grows. Cancel anytime.' },
];

// ── Testimonials ─────────────────────────────────────────────────────────────
const testimonials = [
  {
    quote: 'TenantVault replaced three tools for us. Our files are encrypted, our team is synced in real-time, and our data never mixes with other companies.',
    name: 'Arjun Mehta', role: 'CTO, FinStack India',
  },
  {
    quote: 'The file versioning alone saved us twice. We rolled back a critical document in seconds. The encryption gives our legal team confidence.',
    name: 'Priya Nair', role: 'Operations Head, LegalBridge',
  },
  {
    quote: 'Onboarded our 18-member team in under 10 minutes. The real-time collaboration editor is surprisingly smooth.',
    name: 'Rohan Das', role: 'Founder, CrewSync',
  },
];

// ── Pricing plans ─────────────────────────────────────────────────────────────
const plans = [
  {
    name: 'Starter', price: '₹299', period: '/mo', popular: false,
    features: ['50 GB Encrypted Storage', 'Up to 5 users', 'Real-Time Collaboration', 'File Versioning & Rollback', 'AES-128 Encryption'],
  },
  {
    name: 'Growth', price: '₹799', period: '/mo', popular: true,
    features: ['500 GB Encrypted Storage', 'Up to 25 users', 'Real-Time Collaboration', 'File Versioning & Rollback', 'AES-128 Encryption', 'Priority Support', 'Advanced Analytics'],
  },
  {
    name: 'Enterprise', price: 'Custom', period: '', popular: false,
    features: ['Unlimited Encrypted Storage', 'Unlimited users', 'Everything in Growth', 'Dedicated Support', 'Custom SLA & Compliance', 'On-premise deployment option'],
  },
];

// ── Main Landing Component ───────────────────────────────────────────────────
const Landing = () => {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', color: 'var(--text-primary)' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        background: 'rgba(7,9,15,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--bg-border)', position: 'sticky', top: 0, zIndex: 100,
        padding: '0 5%',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--brand-primary)' }}>Tenant</span>Vault
          </span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', padding: '8px 16px', borderRadius: '8px', transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color='var(--text-primary)'}
              onMouseLeave={e => e.target.style.color='var(--text-secondary)'}
            >Sign In</Link>
            <Link to="/register" style={{ background: 'var(--brand-primary)', color: 'white', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '8px 18px', borderRadius: '8px', transition: 'background 0.15s' }}
              onMouseEnter={e => e.target.style.background='var(--btn-primary-hover)'}
              onMouseLeave={e => e.target.style.background='var(--brand-primary)'}
            >Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero" style={{ position: 'relative', overflow: 'hidden', padding: '100px 5% 80px', textAlign: 'center' }}>
        {/* Glow blob */}
        <div style={{ position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(99,102,241,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--text-accent)', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, marginBottom: '24px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-primary)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            AES-128 Encrypted · Zero-Knowledge
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-1px', marginBottom: '20px' }}>
            One Encrypted Workspace<br />
            <span style={{ color: 'var(--brand-primary)' }}>for Your Entire Team</span>
          </h1>

          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '580px', margin: '0 auto 36px' }}>
            TenantVault gives every company its own isolated, AES-128 encrypted vault with real-time collaboration, file versioning, and team access control — all deployed and running in minutes.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{ background: 'var(--brand-primary)', color: 'white', textDecoration: 'none', padding: '12px 28px', borderRadius: '10px', fontWeight: 600, fontSize: '15px', transition: 'background 0.15s' }}
              onMouseEnter={e => e.target.style.background='var(--btn-primary-hover)'}
              onMouseLeave={e => e.target.style.background='var(--brand-primary)'}
            >Start for Free →</Link>
            <Link to="/login" style={{ background: 'transparent', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', textDecoration: 'none', padding: '12px 28px', borderRadius: '10px', fontWeight: 500, fontSize: '15px', transition: 'background 0.15s' }}
              onMouseEnter={e => e.target.style.background='var(--bg-elevated)'}
              onMouseLeave={e => e.target.style.background='transparent'}
            >Sign In</Link>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section style={{ borderTop: '1px solid var(--bg-border)', borderBottom: '1px solid var(--bg-border)', background: 'var(--bg-surface)', padding: '32px 5%' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '24px' }}>
          {[
            { value: 'AES-128', label: 'Military-grade encryption' },
            { value: 'Real-Time', label: 'Live collaboration sync' },
            { value: '100% Isolated', label: 'Zero data leaks between tenants' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '0 24px', borderRight: i < 2 ? '1px solid var(--bg-border)' : 'none' }}>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--brand-primary)', margin: '0 0 4px' }}>{stat.value}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: '80px 5%', background: 'var(--bg-base)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '12px' }}>
            Trusted by teams who take security seriously
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '48px', fontSize: '16px' }}>
            Real companies, real results.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '16px', padding: '24px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.7, margin: '0 0 20px' }}>"{t.quote}"</p>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>{t.name}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '80px 5%', background: 'var(--bg-surface)', borderTop: '1px solid var(--bg-border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '12px' }}>Everything your team needs</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '48px', fontSize: '16px' }}>Built for security-first teams.</p>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {features.map((f, i) => (
              <div key={i}
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: '16px', padding: '24px', transition: 'transform 0.2s ease, border-color 0.2s ease', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--bg-border)'; }}
              >
                <div style={{ width: '48px', height: '48px', background: 'rgba(99,102,241,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: '16px' }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="pricing-grid-section" style={{ padding: '80px 5%', background: 'var(--bg-base)', borderTop: '1px solid var(--bg-border)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '12px' }}>Simple, transparent pricing</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '48px', fontSize: '16px' }}>Start free, scale as you grow.</p>
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {plans.map((plan, i) => (
              <div key={i} style={{
                background: plan.popular ? 'rgba(99,102,241,0.06)' : 'var(--bg-surface)',
                border: plan.popular ? '2px solid var(--brand-primary)' : '1px solid var(--bg-border)',
                borderRadius: '20px', padding: '32px', position: 'relative'
              }}>
                {plan.popular && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--brand-primary)', color: 'white', fontSize: '12px', fontWeight: 600, padding: '3px 14px', borderRadius: '20px' }}>
                    Most Popular
                  </div>
                )}
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{plan.name}</h3>
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{plan.price}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--brand-success)', fontWeight: 700 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" style={{
                  display: 'block', textAlign: 'center', textDecoration: 'none',
                  padding: '10px 20px', borderRadius: '8px', fontWeight: 500, fontSize: '14px', transition: 'background 0.15s',
                  background: plan.popular ? 'var(--brand-primary)' : 'transparent',
                  color: plan.popular ? 'white' : 'var(--text-primary)',
                  border: plan.popular ? 'none' : '1px solid var(--bg-border)',
                }}>Get Started</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--bg-border)', padding: '32px 5%', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
          © 2026 TenantVault. Built for secure, isolated multi-tenant workspaces.
        </p>
      </footer>

    </div>
  );
};

export default Landing;
