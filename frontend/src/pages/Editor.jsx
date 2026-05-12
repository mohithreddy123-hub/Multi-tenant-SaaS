import React, { useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import api from '../api';
import { Wifi, WifiOff, Users, Lock, Radio } from 'lucide-react';

const COLORS = [
  '#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa',
  '#fb7185', '#38bdf8', '#4ade80',
];

const Editor = () => {
  const { user } = useContext(AuthContext);
  const { docId } = useParams();
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [docTitle, setDocTitle] = useState('Collaborative Scratch Pad');
  const wsRef = useRef(null);
  const textareaRef = useRef(null);
  const selfUsername = user?.username || 'Anonymous';

  const colorMap = useRef({});
  const getColor = (username) => {
    if (!colorMap.current[username]) {
      const idx = Object.keys(colorMap.current).length % COLORS.length;
      colorMap.current[username] = COLORS[idx];
    }
    return colorMap.current[username];
  };

  useEffect(() => {
    if (docId && docId !== '0') {
      api.get('/documents/').then(res => {
        const doc = res.data.find(d => String(d.id) === docId);
        if (doc) setDocTitle(doc.title);
      }).catch(() => {});
    }

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
        event: 'text_change', username: selfUsername, content: newText,
      }));
    }
  };

  const handleMouseMove = (e) => {
    const rect = textareaRef.current?.getBoundingClientRect();
    if (!rect || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      event: 'cursor_move', username: selfUsername,
      top: e.clientY - rect.top, left: e.clientX - rect.left,
    }));
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)' }}>
      {/* Header */}
      <div className="tv-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="tv-page-title">{docTitle}</h1>
          <p className="tv-page-desc">{wordCount} words · {charCount} characters</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className={`tv-badge ${connected ? 'tv-badge-success' : 'tv-badge-error'}`} style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}>
            {connected ? <><Wifi size={12} /> Live · {activeUsers.length + 1} online</> : <><WifiOff size={12} /> Disconnected</>}
          </div>
          <div className="tv-badge tv-badge-info" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}>
            Room: doc-{docId || '0'}
          </div>
          {/* Active users avatars */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <div className="tv-avatar" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>{selfUsername[0].toUpperCase()}</div>
            {activeUsers.map(u => (
              <div key={u} className="tv-avatar" style={{ width: 28, height: 28, fontSize: '0.7rem', background: getColor(u) }}>
                {u[0].toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Editor area */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {Object.entries(cursors).map(([username, pos]) => (
          <div key={username} style={{
            position: 'absolute', top: pos.top + 60, left: pos.left + 16,
            pointerEvents: 'none', zIndex: 10,
          }}>
            <div style={{ width: 2, height: 20, background: pos.color, borderRadius: '2px' }} />
            <div style={{
              background: pos.color, color: '#000', fontSize: '0.65rem', fontWeight: 600,
              padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap',
            }}>{username}</div>
          </div>
        ))}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onMouseMove={handleMouseMove}
          placeholder={`Start typing... Changes sync live to everyone in this room.\n\nOpen this URL in another browser tab to see real-time collaboration.`}
          style={{
            flex: 1, minHeight: '400px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '1.5rem',
            color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.8',
            fontFamily: "'Inter', sans-serif", resize: 'vertical', outline: 'none',
            transition: 'border-color var(--transition)',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Footer tips */}
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { icon: Radio, text: 'Changes sync live via WebSocket' },
          { icon: Users, text: "Other users' cursors shown in real-time" },
          { icon: Lock, text: 'Session scoped to this document room' },
        ].map(tip => {
          const Icon = tip.icon;
          return (
            <div key={tip.text} style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.85rem',
              borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-tertiary)',
              border: '1px solid var(--border)',
            }}>
              <Icon size={13} /> {tip.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Editor;
