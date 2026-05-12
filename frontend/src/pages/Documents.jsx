import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { Upload, X, MoreVertical, Eye, Download, Clock, BarChart3, Trash2, FileText, Loader } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// ── Inline Modal ──
const Modal = ({ title, onClose, children }) => (
  <div className="tv-modal-overlay" onClick={onClose}>
    <div className="tv-modal" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
      <button className="tv-modal-close" onClick={onClose}><X size={18} /></button>
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


  const [versionModal, setVersionModal] = useState(null);   // { doc }
  const [analyticsModal, setAnalyticsModal] = useState(null); // { doc, data }
  const [previewModal, setPreviewModal] = useState(null);    // { doc, url, type }
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
    const previewable = doc.file_type?.startsWith('image/') || doc.file_type === 'application/pdf';
    if (!previewable) {
      // Non-previewable: just download it
      return handleDownload(doc);
    }
    try {
      const res = await api.get(`/documents/${doc.id}/preview/`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: doc.file_type });
      const url = window.URL.createObjectURL(blob);
      setPreviewModal({ doc, url, type: doc.file_type });
      fetchDocuments(); // refresh view count
    } catch (err) {
      let msg = err.message || 'Could not preview this file.';
      // Axios returns error response data as a Blob when responseType is 'blob'
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          msg = json.detail || msg;
        } catch (_) {}
      } else if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      alert(`Preview error: ${msg}`);
    }
  };

  const closePreviewModal = () => {
    if (previewModal?.url) window.URL.revokeObjectURL(previewModal.url);
    setPreviewModal(null);
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="tv-loader" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  return (
    <div className="animate-in">

        <div className="tv-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="tv-page-title">Secure Documents</h1>
            <p className="tv-page-desc">All files are AES-128 encrypted. Upload, version, and track analytics.</p>
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
              className="tv-btn tv-btn-primary" 
              onClick={() => setShowAttach(!showAttach)} 
              disabled={uploading}
            >
              {uploading 
                ? <><div className="tv-loader" style={{ width: 14, height: 14, borderWidth: 2 }} /> Uploading...</> 
                : (showAttach ? <><X size={14} /> Cancel</> : <><Upload size={14} /> Upload</>)}
            </button>

            {showAttach && (
              <div className="attachment-menu">
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
        </div>

        {error && <div className="tv-error">{error}</div>}

        {/* Document List */}
        <div className="tv-card" style={{ padding: 0, overflow: 'visible' }}>
          {documents.length === 0 ? (
            <div className="tv-empty">
              <div className="tv-empty-icon"><FileText size={48} /></div>
              <h3>No documents yet</h3>
              <p>Upload a file to get started. It will be securely encrypted.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
            <table className="tv-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Uploader</th>
                  <th>Size</th>
                  <th>Versions</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{getFileIcon(doc.file_type)}</span>
                        <div>
                          <div style={{ fontWeight: 500 }}>{doc.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{formatBytes(doc.file_size)}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{doc.uploaded_by_name || 'System'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatBytes(doc.file_size)}</td>
                    <td>
                      {doc.status === 'failed' ? (
                        <span className="tv-badge tv-badge-error" title="Encryption failed">Failed</span>
                      ) : (
                        <span className="tv-badge tv-badge-info">v{doc.versions?.length ?? 1}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        {doc.status === 'pending' ? (
                          <span className="tv-badge tv-badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Encrypting...
                          </span>
                        ) : (
                          <>
                            <button className="tv-btn tv-btn-ghost"
                              onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                              style={{ padding: '0.3rem' }}>
                              <MoreVertical size={16} />
                            </button>
                            {openMenuId === doc.id && (
                              <div style={{
                                position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 500,
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                                minWidth: '150px', overflow: 'hidden',
                              }}>
                                {doc.status === 'ready' && (
                                  <>
                                    <button className="doc-menu-item" onClick={() => { handlePreview(doc); setOpenMenuId(null); }}><Eye size={14} /> View</button>
                                    <button className="doc-menu-item" onClick={() => { handleDownload(doc); setOpenMenuId(null); }}><Download size={14} /> Download</button>
                                    <button className="doc-menu-item" onClick={() => { openVersionModal(doc); setOpenMenuId(null); }}><Clock size={14} /> Versions</button>
                                    <button className="doc-menu-item" onClick={() => { openAnalyticsModal(doc); setOpenMenuId(null); }}><BarChart3 size={14} /> Analytics</button>
                                  </>
                                )}
                                {doc.status === 'failed' && (
                                  <div style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', color: 'var(--error)' }}>Encryption failed</div>
                                )}
                                {user?.role === 'admin' && (
                                  <button className="doc-menu-item" style={{ color: 'var(--error)', borderTop: '1px solid var(--border)' }}
                                    onClick={() => { handleDelete(doc); setOpenMenuId(null); }}>
                                    <Trash2 size={14} /> Delete
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
            </div>
          )}
        </div>

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

      {/* ── File Preview Modal ────────────────────────────────── */}
      {previewModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem'
        }}>
          {/* Header bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', maxWidth: '960px', marginBottom: '0.75rem'
          }}>
            <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              👁 {previewModal.doc.title}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button
                onClick={() => handleDownload(previewModal.doc)}
                style={{
                  background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
                  color: '#a5b4fc', borderRadius: '8px', padding: '0.4rem 0.9rem',
                  cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                ⬇️ Download
              </button>
              <button
                onClick={closePreviewModal}
                style={{
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', borderRadius: '8px', padding: '0.4rem 0.9rem',
                  cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Preview content */}
          <div style={{
            width: '100%', maxWidth: '960px', flex: 1, maxHeight: 'calc(100vh - 120px)',
            borderRadius: '16px', overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {previewModal.type?.startsWith('image/') ? (
              <img
                src={previewModal.url}
                alt={previewModal.doc.title}
                style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 140px)', objectFit: 'contain', borderRadius: '12px' }}
              />
            ) : previewModal.type === 'application/pdf' ? (
              <iframe
                src={previewModal.url}
                title={previewModal.doc.title}
                style={{ width: '100%', height: 'calc(100vh - 140px)', border: 'none', borderRadius: '12px' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                <p>Preview not available for this file type.</p>
                <button className="btn btn-primary" onClick={() => handleDownload(previewModal.doc)}>⬇️ Download Instead</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
