import React, { useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';

const COLORS = [
  '#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa',
  '#fb7185', '#38bdf8', '#4ade80',
];

const Editor = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { docId } = useParams();  // 0 = scratch pad, otherwise real doc
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [cursors, setCursors] = useState({});         // { username: { top, left, color } }
  const [docTitle, setDocTitle] = useState('Collaborative Scratch Pad');
  const wsRef = useRef(null);
  const textareaRef = useRef(null);
  const selfUsername = user?.username || 'Anonymous';

  // ── Assign color per username ──
  const colorMap = useRef({});
  const getColor = (username) => {
    if (!colorMap.current[username]) {
      const idx = Object.keys(colorMap.current).length % COLORS.length;
      colorMap.current[username] = COLORS[idx];
    }
    return colorMap.current[username];
  };

  useEffect(() => {
    // If a real doc ID, load its content (decode from API for preview display only)
    if (docId && docId !== '0') {
      api.get('/documents/').then(res => {
        const doc = res.data.find(d => String(d.id) === docId);
        if (doc) setDocTitle(doc.title);
      }).catch(() => {});
    }

    // Open WebSocket to editor room — with auto-reconnect (Fix 3)
    const id = docId || '0';
    let retryCount = 0;
    const maxRetries = 5;
    let retryTimer = null;
    let unmounted = false;

    const connect = () => {
      const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
      const ws = new WebSocket(`${wsBase}/editor/${id}/`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryCount = 0;
        setConnected(true);
        ws.send(JSON.stringify({ event: 'user_join', username: selfUsername }));
      };

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.event === 'text_change' && data.username !== selfUsername) setText(data.content);
        if (data.event === 'user_join' && data.username !== selfUsername)
          setActiveUsers(prev => [...new Set([...prev, data.username])]);
        if (data.event === 'user_leave') {
          setActiveUsers(prev => prev.filter(u => u !== data.username));
          setCursors(prev => { const n = { ...prev }; delete n[data.username]; return n; });
        }
        if (data.event === 'cursor_move' && data.username !== selfUsername)
          setCursors(prev => ({ ...prev, [data.username]: { top: data.top, left: data.left, color: getColor(data.username) } }));
      };

      ws.onclose = () => {
        setConnected(false);
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
      setConnected(false);
    };
  }, [docId]);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'text_change',
        username: selfUsername,
        content: newText,
      }));
    }
  };

  const handleMouseMove = (e) => {
    const rect = textareaRef.current?.getBoundingClientRect();
    if (!rect || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      event: 'cursor_move',
      username: selfUsername,
      top: e.clientY - rect.top,
      left: e.clientX - rect.left,
    }));
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: 'var(--brand-primary)', margin: 0 }}>{user?.tenant?.name || 'Workspace'}</h2>
          <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Editor</p>
        </div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link to="/dashboard" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>📊 Dashboard</Link>
          <Link to="/billing" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>💳 Billing</Link>
          <Link to="/documents" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>📄 Documents</Link>
          <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', background: 'rgba(255,255,255,0.05)' }}>✏️ Collab Editor</button>
          <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }} disabled>⚙️ Settings</button>
        </nav>

        {/* Active collaborators */}
        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Now
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
              <span style={{ fontSize: '0.85rem' }}>{selfUsername} (you)</span>
            </div>
            {activeUsers.map(u => (
              <div key={u} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: getColor(u), display: 'inline-block' }}></span>
                <span style={{ fontSize: '0.85rem' }}>{u}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>{user?.username}</p>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>{user?.role}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="btn btn-secondary btn-block"
            style={{ borderColor: 'var(--accent-error)', color: 'var(--accent-error)' }}>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Editor */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.25rem' }}>{docTitle}</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {wordCount} words · {charCount} characters
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: connected ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
              color: connected ? 'var(--accent-success)' : 'var(--accent-error)',
              padding: '0.4rem 0.9rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 500
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
                background: connected ? 'var(--accent-success)' : 'var(--accent-error)',
                animation: connected ? 'pulse 2s infinite' : 'none'
              }}></span>
              {connected ? `Live · ${activeUsers.length + 1} online` : 'Disconnected'}
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.9rem',
              borderRadius: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)'
            }}>
              Room: doc-{docId || '0'}
            </div>
          </div>
        </header>

        {/* Editor area */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Remote cursors */}
          {Object.entries(cursors).map(([username, pos]) => (
            <div key={username} style={{
              position: 'absolute', top: pos.top + 60, left: pos.left + 16,
              pointerEvents: 'none', zIndex: 10,
            }}>
              <div style={{ width: 2, height: 20, background: pos.color, borderRadius: '2px' }} />
              <div style={{
                background: pos.color, color: '#000', fontSize: '0.7rem', fontWeight: 600,
                padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap',
                transform: 'translateY(-2px)', marginTop: '-2px'
              }}>{username}</div>
            </div>
          ))}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onMouseMove={handleMouseMove}
            placeholder={`Start typing... Your changes sync live to everyone in this room.\n\nThis is a collaborative scratch pad. Open this URL in another browser tab to see real-time collaboration in action.`}
            style={{
              flex: 1,
              minHeight: '500px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-light)',
              borderRadius: '16px',
              padding: '2rem',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              lineHeight: '1.7',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-light)'}
          />
        </div>

        {/* Footer tips */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { icon: '🔴', text: 'Changes sync live via WebSocket' },
            { icon: '👥', text: 'Other users\' cursors shown in real-time' },
            { icon: '🔒', text: 'Session is scoped to this document room' },
          ].map(tip => (
            <div key={tip.text} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(255,255,255,0.04)', padding: '0.4rem 0.85rem',
              borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)'
            }}>
              <span>{tip.icon}</span> {tip.text}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Editor;
