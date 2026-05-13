import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import api from '../api';
import {
  Wifi, WifiOff, Users, Lock, Radio, ChevronRight,
  Clock, Activity, MessageCircle, Zap, Circle,
  Send, Hash, RefreshCw
} from 'lucide-react';

/* ─── Constants ─────────────────────────────── */
const COLORS = [
  '#60a5fa','#34d399','#f472b6','#fbbf24',
  '#a78bfa','#fb7185','#38bdf8','#4ade80',
];

/* ─── Sub-components ────────────────────────── */

const UserAvatar = ({ name, color, size = 32, pulse = false }) => (
  <div title={name} style={{
    width: size, height: size, borderRadius: '50%',
    background: color || 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.38, fontWeight: 700, color: '#fff',
    border: `2px solid rgba(255,255,255,0.15)`,
    position: 'relative', flexShrink: 0,
    boxShadow: pulse ? `0 0 0 3px ${color}40` : 'none',
    transition: 'box-shadow 0.3s',
  }}>
    {name[0]?.toUpperCase()}
    {pulse && (
      <span style={{
        position: 'absolute', bottom: 0, right: 0,
        width: 9, height: 9, borderRadius: '50%',
        background: '#10b981', border: '2px solid var(--bg-base)',
      }} />
    )}
  </div>
);

const SyncBadge = ({ connected }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.3rem 0.85rem', borderRadius: '999px',
    fontSize: '0.75rem', fontWeight: 600,
    background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
    color: connected ? '#10b981' : '#ef4444',
    border: `1px solid ${connected ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
  }}>
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: connected ? '#10b981' : '#ef4444',
      animation: connected ? 'pulse 2s infinite' : 'none',
    }} />
    {connected ? 'Live · Synced' : 'Disconnected'}
  </div>
);

const ActivityItem = ({ user, action, time, color }) => (
  <div style={{
    display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
    padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
  }}>
    <div style={{
      width: 24, height: 24, borderRadius: '50%',
      background: color || 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.65rem', fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>{user[0]?.toUpperCase()}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)', margin: 0 }}>
        <span style={{ fontWeight: 600, color }}>{user}</span>{' '}{action}
      </p>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', margin: '0.1rem 0 0' }}>{time}</p>
    </div>
  </div>
);

/* ─── Main Editor Component ─────────────────── */
const Editor = () => {
  const { user } = useContext(AuthContext);
  const { docId } = useParams();

  /* — preserved state — */
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [docTitle, setDocTitle] = useState('Collaborative Workspace');
  const wsRef = useRef(null);
  const textareaRef = useRef(null);
  const selfUsername = user?.username || 'Anonymous';
  const colorMap = useRef({});

  /* — UI state — */
  const [sidebarTab, setSidebarTab] = useState('presence'); // presence | activity | chat
  const [activity, setActivity] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [reconnecting, setReconnecting] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const typingTimer = useRef(null);

  const getColor = useCallback((username) => {
    if (!colorMap.current[username]) {
      const idx = Object.keys(colorMap.current).length % COLORS.length;
      colorMap.current[username] = COLORS[idx];
    }
    return colorMap.current[username];
  }, []);

  const addActivity = useCallback((user, action) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setActivity(prev => [{ user, action, time, color: getColor(user), id: Date.now() }, ...prev].slice(0, 20));
  }, [getColor]);

  /* ── WebSocket (PRESERVED EXACTLY) ── */
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
      setReconnecting(retryCount > 0);
      const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
      const ws = new WebSocket(`${wsBase}/editor/${id}/`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryCount = 0;
        setConnected(true);
        setReconnecting(false);
        setShowOfflineBanner(false);
        ws.send(JSON.stringify({ event: 'user_join', username: selfUsername }));
        if (retryCount > 0) addActivity('System', '— Connection restored');
      };

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.event === 'text_change' && data.username !== selfUsername) {
          setText(data.content);
        }
        if (data.event === 'user_join' && data.username !== selfUsername) {
          setActiveUsers(prev => [...new Set([...prev, data.username])]);
          addActivity(data.username, 'joined the workspace');
        }
        if (data.event === 'user_leave') {
          setActiveUsers(prev => prev.filter(u => u !== data.username));
          setCursors(prev => { const n = { ...prev }; delete n[data.username]; return n; });
          addActivity(data.username, 'left the workspace');
        }
        if (data.event === 'cursor_move' && data.username !== selfUsername) {
          setCursors(prev => ({
            ...prev,
            [data.username]: { top: data.top, left: data.left, color: getColor(data.username) }
          }));
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setShowOfflineBanner(true);
        if (unmounted) return;
        if (retryCount < maxRetries) {
          retryCount++;
          setReconnecting(true);
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          retryTimer = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => ws.close();
    };

    connect();
    addActivity(selfUsername, 'opened the workspace');

    return () => {
      unmounted = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (wsRef.current) wsRef.current.close();
      setConnected(false);
    };
  }, [docId]);

  /* ── Text & Cursor handlers (PRESERVED) ── */
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    setWordCount(newText.trim() ? newText.trim().split(/\s+/).length : 0);
    setCharCount(newText.length);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'text_change', username: selfUsername, content: newText,
      }));
    }
    // Typing indicator
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {}, 1500);
  };

  const handleMouseMove = (e) => {
    const rect = textareaRef.current?.getBoundingClientRect();
    if (!rect || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      event: 'cursor_move', username: selfUsername,
      top: e.clientY - rect.top, left: e.clientX - rect.left,
    }));
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { user: selfUsername, text: chatInput, time, id: Date.now() }]);
    setChatInput('');
  };

  const allUsers = [selfUsername, ...activeUsers];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', gap: 0 }}>

      {/* ── OFFLINE BANNER ── */}
      {showOfflineBanner && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          padding: '0.6rem 1.25rem', borderRadius: '10px', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          color: '#ef4444', fontSize: '0.85rem', fontWeight: 500,
        }}>
          <WifiOff size={15} />
          {reconnecting ? (
            <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Reconnecting to collaboration server...</>
          ) : (
            'Connection lost. Changes will not sync until reconnected.'
          )}
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.85rem 1.25rem', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap',
      }}>
        {/* Title + Room */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{docTitle}</h1>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              Room · doc-{docId || '0'} · {wordCount} words
            </div>
          </div>
        </div>

        {/* Center: avatars */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '-4px' }}>
            {allUsers.slice(0, 6).map((u, i) => (
              <div key={u} style={{ marginLeft: i > 0 ? '-8px' : 0, zIndex: 10 - i }}>
                <UserAvatar name={u} color={u === selfUsername ? 'var(--accent)' : getColor(u)} size={28} pulse={connected} />
              </div>
            ))}
          </div>
          {allUsers.length > 0 && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
              {allUsers.length} {allUsers.length === 1 ? 'person' : 'people'} here
            </span>
          )}
        </div>

        {/* Right: status */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <SyncBadge connected={connected} />
        </div>
      </div>

      {/* ── MAIN BODY: Editor + Sidebar ── */}
      <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>

        {/* ── EDITOR AREA ── */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>

          {/* Cursors overlay */}
          {Object.entries(cursors).map(([username, pos]) => (
            <div key={username} style={{
              position: 'absolute',
              top: pos.top + 16, left: pos.left + 16,
              pointerEvents: 'none', zIndex: 10,
              transition: 'top 0.1s, left 0.1s',
            }}>
              <div style={{ width: 2, height: 20, background: pos.color, borderRadius: '2px' }} />
              <div style={{
                background: pos.color, color: '#000', fontSize: '0.65rem', fontWeight: 700,
                padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', marginTop: '2px',
              }}>{username}</div>
            </div>
          ))}

          {/* The Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onMouseMove={handleMouseMove}
            placeholder={`Start writing...\n\nThis workspace syncs live with everyone in this room. Open this page in another tab to see collaboration in real-time.`}
            style={{
              flex: 1,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '2rem 2.5rem',
              color: 'var(--text-primary)',
              fontSize: '1.05rem',
              lineHeight: '1.9',
              fontFamily: "'Inter', sans-serif",
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              letterSpacing: '0.01em',
            }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--accent)';
              e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
          />

          {/* Footer tips */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { icon: Radio, text: 'Changes sync live via WebSocket' },
              { icon: Users, text: "Other users' cursors shown in real-time" },
              { icon: Lock, text: 'Session scoped to this document room' },
            ].map(tip => (
              <div key={tip.text} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: 'rgba(255,255,255,0.02)', padding: '0.35rem 0.75rem',
                borderRadius: '8px', fontSize: '0.72rem', color: 'var(--text-tertiary)',
                border: '1px solid var(--border)',
              }}>
                <tip.icon size={11} /> {tip.text}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div style={{
          width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', overflow: 'hidden',
        }}>
          {/* Sidebar Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {[
              { id: 'presence', icon: Users, label: 'People' },
              { id: 'activity', icon: Activity, label: 'Activity' },
              { id: 'chat', icon: MessageCircle, label: 'Chat' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setSidebarTab(tab.id)} style={{
                flex: 1, padding: '0.7rem 0.25rem',
                background: sidebarTab === tab.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                border: 'none', borderBottom: sidebarTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                color: sidebarTab === tab.id ? 'var(--accent)' : 'var(--text-tertiary)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '2px', fontSize: '0.65rem', fontWeight: 600,
                transition: 'all 0.2s',
              }}>
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sidebar Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>

            {/* ── PRESENCE TAB ── */}
            {sidebarTab === 'presence' && (
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                  Active Now · {allUsers.length}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Self */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.6rem 0.75rem', borderRadius: '10px',
                    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)',
                  }}>
                    <UserAvatar name={selfUsername} color="var(--accent)" size={32} pulse />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{selfUsername}</p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#10b981' }}>● You · Active</p>
                    </div>
                  </div>
                  {/* Others */}
                  {activeUsers.map(u => (
                    <div key={u} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.6rem 0.75rem', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                    }}>
                      <UserAvatar name={u} color={getColor(u)} size={32} pulse={connected} />
                      <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>{u}</p>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: connected ? getColor(u) : 'var(--text-tertiary)' }}>
                          {connected ? '● Collaborating' : '○ Away'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activeUsers.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '1.5rem', lineHeight: 1.6 }}>
                      Share this room link to invite collaborators.
                    </p>
                  )}
                </div>

                <div style={{ marginTop: '1.5rem', padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                    Room Info
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Room ID</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>doc-{docId || '0'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Words</span>
                      <span>{wordCount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Characters</span>
                      <span>{charCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── ACTIVITY TAB ── */}
            {sidebarTab === 'activity' && (
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                  Live Activity Feed
                </p>
                {activity.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '2rem' }}>
                    No activity yet.
                  </p>
                )}
                {activity.map(item => (
                  <ActivityItem key={item.id} {...item} />
                ))}
              </div>
            )}

            {/* ── CHAT TAB ── */}
            {sidebarTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                  Discussion
                </p>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {messages.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '2rem', lineHeight: 1.6 }}>
                      No messages yet. Start the discussion!
                    </p>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id} style={{
                      display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                      flexDirection: msg.user === selfUsername ? 'row-reverse' : 'row',
                    }}>
                      <UserAvatar name={msg.user} color={msg.user === selfUsername ? 'var(--accent)' : getColor(msg.user)} size={24} />
                      <div style={{
                        background: msg.user === selfUsername ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${msg.user === selfUsername ? 'rgba(99,102,241,0.2)' : 'var(--border)'}`,
                        borderRadius: '10px', padding: '0.5rem 0.75rem', maxWidth: '80%',
                      }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-primary)' }}>{msg.text}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>{msg.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Send a message..."
                    className="tv-input"
                    style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                  />
                  <button onClick={sendMessage} className="tv-btn tv-btn-primary" style={{ padding: '0.5rem 0.75rem' }}>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
