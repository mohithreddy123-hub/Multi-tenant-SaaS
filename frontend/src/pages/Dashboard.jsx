import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveEvent, setLiveEvent] = useState(null);
  const wsRef = useRef(null);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard/');
      setData(response.data);
    } catch (err) {
      console.error('Failed to load dashboard data.', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // ── Real-time WebSocket connection ──
  useEffect(() => {
    if (!user?.tenant?.id) return;
    const tenantId = user.tenant.id;
    const ws = new WebSocket(`ws://localhost:8000/ws/tenant/${tenantId}/`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.event === 'document_uploaded' || msg.event === 'document_deleted') {
        // Show live notification banner
        setLiveEvent(msg);
        setTimeout(() => setLiveEvent(null), 4000);
        // Silently refresh dashboard stats
        fetchDashboard();
      }
    };

    ws.onerror = () => console.warn('Dashboard WebSocket unavailable.');

    return () => ws.close();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) return (
    <div className="auth-container">
      <span className="loader" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></span>
    </div>
  );

  const storagePct = data?.stats?.storage_percent ?? 0;
  const storageColor = storagePct > 80 ? 'var(--accent-error)' : storagePct > 50 ? '#f59e0b' : 'var(--accent-success)';

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: 'var(--brand-primary)', margin: 0 }}>{data?.tenant?.name}</h2>
          <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Workspace</p>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', background: 'rgba(255,255,255,0.05)' }}>
            📊 Dashboard
          </button>
          <Link to="/billing" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>
            💳 Billing
          </Link>
          <Link to="/documents" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>
            📄 Documents
          </Link>
          <Link to="/editor/0" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>
            ✏️ Collab Editor
          </Link>
          <Link to="/settings" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>
            ⚙️ Settings
          </Link>
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>{user?.username}</p>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-block" style={{ borderColor: 'var(--accent-error)', color: 'var(--accent-error)' }}>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Live event banner */}
        {liveEvent && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(99,102,241,0.15))',
            border: '1px solid rgba(16,185,129,0.4)',
            borderRadius: '12px',
            padding: '0.85rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            animation: 'fadeIn 0.3s ease',
          }}>
            <span style={{ fontSize: '1.2rem' }}>🔴</span>
            <span style={{ color: 'var(--accent-success)', fontWeight: 500 }}>
              Live: {liveEvent.uploader} just uploaded "{liveEvent.doc_title}" — dashboard refreshed automatically.
            </span>
          </div>
        )}

        <header className="page-header">
          <div>
            <h1>Overview</h1>
            <p style={{ margin: 0 }}>Welcome back, {user?.username}. Here's what's happening at {data?.tenant?.name}.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(16,185,129,0.08)', color: 'var(--accent-success)',
              padding: '0.4rem 0.9rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-success)', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
              Live Sync ON
            </div>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)',
              padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 500, fontSize: '0.9rem'
            }}>
              Plan: {data?.tenant?.plan}
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 0 }}>👥 Active Users</h3>
            <p style={{ fontSize: '2.2rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
              {data?.stats?.total_active_users}
              <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400 }}> / {data?.tenant?.user_limit}</span>
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 0 }}>📄 Total Documents</h3>
            <p style={{ fontSize: '2.2rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
              {data?.stats?.total_documents ?? 0}
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 0 }}>🔒 Privacy Status</h3>
            <p style={{ fontSize: '1.6rem', color: 'var(--accent-success)', fontWeight: 700, margin: '0 0 0.75rem' }}>
              Protected
              <span style={{ fontSize: '0.9rem', color: 'var(--accent-success)', fontWeight: 400, marginLeft: '8px' }}>AES-128 ✅</span>
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Zero-knowledge encryption active
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 0 }}>🌐 Workspace Domain</h3>
            <p style={{ fontSize: '1rem', color: 'var(--brand-primary)', fontWeight: 500, margin: 0, wordBreak: 'break-all' }}>
              {data?.tenant?.domain}
            </p>
          </div>
        </div>


      </main>
    </div>
  );
};

export default Dashboard;
