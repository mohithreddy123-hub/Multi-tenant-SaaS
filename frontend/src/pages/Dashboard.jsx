import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
  Users, FileText, Shield, Globe, Zap,
  Upload, UserPlus, PenTool, ArrowUpRight
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
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

  useEffect(() => { fetchDashboard(); }, []);

  // Real-time WebSocket — with auto-reconnect
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="tv-loader" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  const storagePct = data?.stats?.storage_percent ?? 0;
  const storageColor = storagePct > 80 ? 'var(--error)' : storagePct > 50 ? 'var(--warning)' : 'var(--success)';

  const stats = [
    { label: 'Active Users', value: data?.stats?.total_active_users, sub: `/ ${data?.tenant?.user_limit} seats`, icon: Users, color: 'var(--accent)' },
    { label: 'Total Documents', value: data?.stats?.total_documents ?? 0, sub: 'encrypted files', icon: FileText, color: 'var(--accent-cyan)' },
    { label: 'Privacy Status', value: 'Protected', sub: 'AES-128 · Zero-knowledge', icon: Shield, color: 'var(--success)' },
    { label: 'Workspace', value: data?.tenant?.domain, sub: data?.tenant?.plan + ' plan', icon: Globe, color: 'var(--accent-secondary)' },
  ];

  const quickActions = [
    { label: 'Upload File', icon: Upload, onClick: () => navigate('/documents'), color: 'var(--accent)' },
    { label: 'Invite Member', icon: UserPlus, onClick: () => navigate('/team'), color: 'var(--success)' },
    { label: 'Open Editor', icon: PenTool, onClick: () => navigate('/editor/0'), color: 'var(--accent-secondary)' },
    { label: 'Upgrade Plan', icon: ArrowUpRight, onClick: () => navigate('/billing'), color: 'var(--warning)' },
  ];

  return (
    <div className="animate-in">
      {/* Live event banner */}
      {liveEvent && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(99,102,241,0.1))',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 'var(--radius)',
          padding: '0.75rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          animation: 'slideUp 0.3s ease',
        }}>
          <Zap size={16} style={{ color: 'var(--success)' }} />
          <span style={{ color: 'var(--success)', fontWeight: 500, fontSize: '0.85rem' }}>
            Live: {liveEvent.uploader} uploaded "{liveEvent.doc_title}"
          </span>
        </div>
      )}

      {/* Header */}
      <div className="tv-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="tv-page-title">Overview</h1>
          <p className="tv-page-desc">Welcome back, {user?.username}. Here's what's happening at {data?.tenant?.name}.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="tv-badge tv-badge-success" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Live Sync
          </div>
          <div className="tv-badge tv-badge-info" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}>
            {data?.tenant?.plan}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="tv-grid tv-grid-4" style={{ marginBottom: '2rem' }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="tv-card tv-card-glow tv-stat">
              <div className="tv-stat-label">
                <Icon size={15} style={{ color: s.color }} />
                {s.label}
              </div>
              <div className="tv-stat-value" style={{ color: s.label === 'Privacy Status' ? 'var(--success)' : 'var(--text-primary)', fontSize: s.label === 'Workspace' ? '0.95rem' : undefined }}>
                {s.value}
                {s.label === 'Active Users' && <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 6 }}>{s.sub}</span>}
              </div>
              {s.label !== 'Active Users' && <div className="tv-stat-sub">{s.sub}</div>}
            </div>
          );
        })}
      </div>

      {/* Storage Usage */}
      <div className="tv-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Storage Usage</span>
          <span style={{ fontSize: '0.8rem', color: storageColor, fontWeight: 600 }}>{storagePct}%</span>
        </div>
        <div className="tv-progress">
          <div className="tv-progress-fill" style={{ width: `${storagePct}%`, background: storageColor }} />
        </div>
      </div>

      {/* Quick Actions */}
      <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>Quick Actions</h3>
      <div className="tv-grid tv-grid-4" style={{ marginBottom: '2rem' }}>
        {quickActions.map((a, i) => {
          const Icon = a.icon;
          return (
            <button key={i} className="tv-card tv-card-glow" onClick={a.onClick}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border)' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `color-mix(in srgb, ${a.color} 12%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} style={{ color: a.color }} />
              </div>
              <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
