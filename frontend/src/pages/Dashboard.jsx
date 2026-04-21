import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useMobileSidebar } from '../hooks/useMobileSidebar';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveEvent, setLiveEvent] = useState(null);
  const wsRef = useRef(null);
  const { sidebarOpen, toggleSidebar, closeSidebar } = useMobileSidebar();

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
  // Real-time WebSocket — with auto-reconnect (Fix 3)
  useEffect(() => {
    if (!user?.tenant?.id) return;
    let retryCount = 0;
    const maxRetries = 5;
    let retryTimer = null;
    let unmounted = false;

    const connect = () => {
      const tenantId = user.tenant.id;
      const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
      const ws = new WebSocket(`${wsBase}/tenant/${tenantId}/`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.event === 'document_uploaded' || msg.event === 'document_deleted') {
          setLiveEvent(msg);
          setTimeout(() => setLiveEvent(null), 4000);
          fetchDashboard();
        }
      };

      ws.onopen = () => { retryCount = 0; };

      ws.onclose = () => {
        if (unmounted) return;
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          retryTimer = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      unmounted = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (wsRef.current) wsRef.current.close();
    };
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
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}
      <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '8px 16px 4px' }}>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{data?.tenant?.name}</p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', paddingBottom: '16px' }}>Workspace</p>
        </div>
        <nav style={{ flex: 1 }}>
          <button onClick={closeSidebar} className="sidebar-nav-item active">📊 Dashboard</button>
          <Link onClick={closeSidebar} to="/billing" className="sidebar-nav-item">💳 Billing</Link>
          <Link onClick={closeSidebar} to="/documents" className="sidebar-nav-item">📄 Documents</Link>
          <Link onClick={closeSidebar} to="/editor/0" className="sidebar-nav-item">✏️ Collab Editor</Link>
          <Link onClick={closeSidebar} to="/team" className="sidebar-nav-item">👥 Team</Link>
          <Link onClick={closeSidebar} to="/settings" className="sidebar-nav-item">⚙️ Settings</Link>
        </nav>
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--sidebar-border)', padding: '12px 16px' }}>
          <div style={{ marginBottom: '8px' }}>
            <p style={{ margin: 0, fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)' }}>{user?.username}</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{user?.role}</p>
          </div>
          <button onClick={handleLogout}
            style={{ width: '100%', padding: '8px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: 'var(--brand-danger)', background: 'transparent', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s', marginTop: '8px' }}
            onMouseEnter={e => e.target.style.background='rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.target.style.background='transparent'}
          >
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

        <header className="page-header page-enter">
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.3px' }}>Overview</h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Welcome back, {user?.username}. Here’s what’s happening at {data?.tenant?.name}.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              color: 'var(--brand-success)',
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-success)', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
              Live Sync ON
            </div>
            <div style={{
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
              color: 'var(--text-accent)',
              padding: '4px 12px', borderRadius: '20px', fontWeight: 500, fontSize: '12px'
            }}>
              Plan: {data?.tenant?.plan}
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '16px', padding: '20px 24px', transition: 'border-color 0.2s', cursor: 'default' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='rgba(99,102,241,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='var(--bg-border)'}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 8px' }}>👥 Active Users</p>
            <p style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
              {data?.stats?.total_active_users}
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 400 }}> / {data?.tenant?.user_limit}</span>
            </p>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '16px', padding: '20px 24px', transition: 'border-color 0.2s', cursor: 'default' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='rgba(99,102,241,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='var(--bg-border)'}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>📄 Total Documents</p>
            <p style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
              {data?.stats?.total_documents ?? 0}
            </p>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '16px', padding: '20px 24px', transition: 'border-color 0.2s', cursor: 'default' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='rgba(99,102,241,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='var(--bg-border)'}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 8px' }}>🔒 Privacy Status</p>
            <p style={{ fontSize: '28px', fontWeight: 600, color: 'var(--brand-success)', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
              Protected
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>AES-128 ✓ Zero-knowledge</p>
          </div>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: '16px', padding: '20px 24px', transition: 'border-color 0.2s', cursor: 'default' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='rgba(99,102,241,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='var(--bg-border)'}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 8px' }}>🌐 Workspace Domain</p>
            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--brand-secondary)', margin: 0, wordBreak: 'break-all' }}>
              {data?.tenant?.domain}
            </p>
          </div>
        </div>


      </main>
    </div>
  );
};

export default Dashboard;
