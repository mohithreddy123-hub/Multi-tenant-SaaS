import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useMobileSidebar } from '../hooks/useMobileSidebar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// ── Inline Modal ──
const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, padding: '1rem'
  }}>
    <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '2rem', position: 'relative', maxHeight: '80vh', overflowY: 'auto' }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: '1rem', right: '1rem', background: 'none',
        border: 'none', color: 'var(--text-secondary)', fontSize: '1.4rem', cursor: 'pointer'
      }}>×</button>
      <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem' }}>{title}</h2>
      {children}
    </div>
  </div>
);

const Documents = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const wsRef = useRef(null);
  const { sidebarOpen, toggleSidebar, closeSidebar } = useMobileSidebar();

  const [versionModal, setVersionModal] = useState(null);   // { doc }
  const [analyticsModal, setAnalyticsModal] = useState(null); // { doc, data }
  const [rollingBack, setRollingBack] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [acceptType, setAcceptType] = useState("*/*");
  const [openMenuId, setOpenMenuId] = useState(null); // tracks which row's 3-dot menu is open

  useEffect(() => { fetchDocuments(); }, []);

  // Real-time WebSocket — with auto-reconnect (Fix 3)
  useEffect(() => {
    if (!user?.tenant?.id) return;
    let retryCount = 0;
    const maxRetries = 5;
    let retryTimer = null;
    let unmounted = false;

    const connect = () => {
      const wsBase = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
      const ws = new WebSocket(`${wsBase}/tenant/${user.tenant.id}/`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (
          msg.event === 'document_uploaded' ||
          msg.event === 'document_ready' ||
          msg.event === 'document_deleted'
        ) {
          fetchDocuments();
        }
      };

      ws.onopen = () => { retryCount = 0; };  // Reset counter on successful connection

      ws.onclose = () => {
        if (unmounted) return;
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
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
  }, [user?.tenant?.id]);

  const fetchDocuments = async () => {
    try {
      const dbRes = await api.get('/dashboard/');
      setTenant(dbRes.data.tenant);
      const docsRes = await api.get('/documents/');
      setDocuments(docsRes.data);
    } catch (err) {
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    try {
      await api.post('/documents/upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', doc.original_filename);
      document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
      fetchDocuments();
    } catch (err) {
      alert('Failed to download document.');
    }
  };

  const handlePreview = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/preview/`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: doc.file_type || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      fetchDocuments(); // refresh view count
    } catch (err) {
      alert('Could not preview this file. Try downloading it instead.');
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/documents/${doc.id}/`);
      // No need to fetchDocuments() immediately because WebSocket will trigger it
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete document.');
    }
  };

  const openVersionModal = (doc) => setVersionModal({ doc });

  const handleRollback = async (doc, versionNumber) => {
    if (!window.confirm(`Roll back "${doc.title}" to version ${versionNumber}?`)) return;
    setRollingBack(true);
    try {
      await api.post(`/documents/${doc.id}/rollback/${versionNumber}/`);
      alert(`✅ Rolled back to version ${versionNumber} successfully!`);
      setVersionModal(null);
      fetchDocuments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Rollback failed.');
    } finally {
      setRollingBack(false);
    }
  };

  const openAnalyticsModal = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/analytics/`);
      setAnalyticsModal({ doc, data: res.data });
      fetchDocuments(); // Refresh view count in list
    } catch (err) {
      alert('Failed to load analytics.');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return '📄';
    if (fileType.includes('pdf')) return '📕';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎬';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('zip') || fileType.includes('compressed')) return '🗜️';
    return '📄';
  };

  if (loading) return (
    <div className="auth-container">
      <span className="loader" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></span>
    </div>
  );

  // Sidebar shared component
  const Sidebar = () => (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--brand-primary)', margin: 0 }}>{tenant?.name}</h2>
        <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Workspace</p>
      </div>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link onClick={closeSidebar} to="/dashboard" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>📊 Dashboard</Link>
        <Link onClick={closeSidebar} to="/billing" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>💳 Billing</Link>
        <button onClick={closeSidebar} className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', background: 'rgba(255,255,255,0.05)' }}>📄 Documents</button>
        <Link onClick={closeSidebar} to="/editor/0" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>✏️ Collab Editor</Link>
        <button onClick={closeSidebar} className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }} disabled>⚙️ Settings</button>
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
  );

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}
      <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
      <Sidebar />

      <main className="main-content">
        <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Secure Documents</h1>
            <p style={{ margin: 0 }}>All files are AES-128 encrypted. Upload, version, and track analytics.</p>
          </div>
          <div className="attachment-menu-container">
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
              accept={acceptType}
            />
            
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAttach(!showAttach)} 
              disabled={uploading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {uploading 
                ? <><span className="loader" style={{ width: 16, height: 16, borderWidth: 2 }}></span> Uploading...</> 
                : (showAttach ? '✕ Cancel' : '☁️ Upload')}
            </button>

            {showAttach && (
              <div className="attachment-menu" style={{ bottom: 'calc(100% + 10px)', top: 'auto', right: 0, left: 'auto' }}>
                {/* Row 1 */}
                <button className="attachment-item" onClick={() => { setAcceptType('image/*'); setShowAttach(false); setTimeout(() => fileInputRef.current.click(), 100); }}>
                  <div className="attachment-icon-circle" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>🖼️</div>
                  <span className="attachment-label">Image</span>
                </button>
                <button className="attachment-item" onClick={() => { setAcceptType('video/*'); setShowAttach(false); setTimeout(() => fileInputRef.current.click(), 100); }}>
                  <div className="attachment-icon-circle" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>🎬</div>
                  <span className="attachment-label">Video</span>
                </button>
                <button className="attachment-item" onClick={() => { setAcceptType('audio/*'); setShowAttach(false); setTimeout(() => fileInputRef.current.click(), 100); }}>
                  <div className="attachment-icon-circle" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>🎙️</div>
                  <span className="attachment-label">Audio</span>
                </button>
                {/* Row 2 */}
                <button className="attachment-item" onClick={() => { setAcceptType('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'); setShowAttach(false); setTimeout(() => fileInputRef.current.click(), 100); }}>
                  <div className="attachment-icon-circle" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>📄</div>
                  <span className="attachment-label">Document</span>
                </button>
                <button className="attachment-item" onClick={() => { setAcceptType('.zip,.rar,.7z,.tar,.gz'); setShowAttach(false); setTimeout(() => fileInputRef.current.click(), 100); }}>
                  <div className="attachment-icon-circle" style={{ background: 'linear-gradient(135deg, #64748b, #334155)' }}>🗜️</div>
                  <span className="attachment-label">Archive</span>
                </button>
                <button className="attachment-item" onClick={() => { setAcceptType('*/*'); setShowAttach(false); setTimeout(() => fileInputRef.current.click(), 100); }}>
                  <div className="attachment-icon-circle" style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>📁</div>
                  <span className="attachment-label">Any File</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-error)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
            {error}
          </div>
        )}

        {/* Document List */}
        <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          {documents.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
              <h3>No documents yet</h3>
              <p>Upload a file to get started. It will be securely encrypted.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Name</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Uploader</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Size</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Versions</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }} className="table-row-hover">
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{getFileIcon(doc.file_type)}</span>
                        <div>
                          <div>{doc.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatBytes(doc.file_size)}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{doc.uploaded_by_name || 'System'}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{formatBytes(doc.file_size)}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {doc.status === 'failed' ? (
                        <span
                          title="Encryption failed. You can delete this file."
                          style={{
                            background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                            padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem',
                            fontWeight: 600, cursor: 'help'
                          }}
                        >
                          ❌ Failed
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                          padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600
                        }}>
                          v{doc.versions?.length ?? 1}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      {/* 3-dot context menu */}
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        {doc.status === 'pending' ? (
                          <span style={{
                            background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                            padding: '0.3rem 0.8rem', borderRadius: '999px',
                            fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
                          }}>
                            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Encrypting...
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                              style={{
                                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-light)',
                                color: 'var(--text-secondary)', borderRadius: '8px',
                                width: '34px', height: '34px', cursor: 'pointer', fontSize: '1.1rem',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                              }}
                              title="Actions"
                            >
                              ⋮
                            </button>
                            {openMenuId === doc.id && (
                              <div style={{
                                position: 'absolute', right: 0, bottom: 'calc(100% + 6px)', top: 'auto', zIndex: 200,
                                background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                                borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                                minWidth: '160px', overflow: 'hidden'
                              }}>
                                {doc.status === 'ready' && (
                                  <>
                                    <button className="doc-menu-item" onClick={() => { handlePreview(doc); setOpenMenuId(null); }}>👁 View</button>
                                    <button className="doc-menu-item" onClick={() => { handleDownload(doc); setOpenMenuId(null); }}>⬇️ Download</button>
                                    <button className="doc-menu-item" onClick={() => { openVersionModal(doc); setOpenMenuId(null); }}>🕒 Versions</button>
                                    <button className="doc-menu-item" onClick={() => { openAnalyticsModal(doc); setOpenMenuId(null); }}>📈 Analytics</button>
                                  </>
                                )}
                                {doc.status === 'failed' && (
                                  <div style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', color: '#ef4444' }}>❌ Encryption failed</div>
                                )}
                                {user?.role === 'admin' && (
                                  <button
                                    className="doc-menu-item"
                                    style={{ color: '#ef4444', borderTop: '1px solid var(--border-light)' }}
                                    onClick={() => { handleDelete(doc); setOpenMenuId(null); }}
                                  >
                                    🗑️ Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ── Version History Modal ─────────────────────────────── */}
      {versionModal && (
        <Modal title={`🕒 Version History — ${versionModal.doc.title}`} onClose={() => setVersionModal(null)}>
          {versionModal.doc.versions?.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No versions found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {versionModal.doc.versions?.map((v) => (
                <div key={v.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(255,255,255,0.04)', padding: '0.85rem 1.2rem',
                  borderRadius: '10px', border: '1px solid var(--border-light)'
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#a5b4fc' }}>Version {v.version_number}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginLeft: '0.75rem' }}>
                      by {v.created_by_name} · {new Date(v.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.4)' }}
                    onClick={() => handleRollback(versionModal.doc, v.version_number)}
                    disabled={rollingBack}
                  >
                    {rollingBack ? '...' : '↩ Rollback'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* ── Analytics Modal ───────────────────────────────────── */}
      {analyticsModal && (
        <Modal title={`📈 Analytics — ${analyticsModal.doc.title}`} onClose={() => setAnalyticsModal(null)}>
          <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
            {[
              { label: 'Views', value: analyticsModal.data.views_count, color: '#60a5fa' },
              { label: 'Downloads', value: analyticsModal.data.downloads_count, color: '#34d399' },
              { label: 'Edits', value: analyticsModal.data.edits_count, color: '#f472b6' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color }}>{value}</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</p>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { name: 'Views', count: analyticsModal.data.views_count },
              { name: 'Downloads', count: analyticsModal.data.downloads_count },
              { name: 'Edits', count: analyticsModal.data.edits_count },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e1e2e', border: '1px solid var(--border-light)', borderRadius: '8px', color: '#f0f0f0' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {['#60a5fa', '#34d399', '#f472b6'].map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Modal>
      )}
    </div>
  );
};

export default Documents;
