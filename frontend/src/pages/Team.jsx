import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useMobileSidebar } from '../hooks/useMobileSidebar';

/* ─── Role Badge ──────────────────────────────────────── */
const RoleBadge = ({ role }) => (
  <span style={{
    padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
    background: role === 'admin' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.1)',
    color: role === 'admin' ? '#a5b4fc' : '#34d399',
  }}>
    {role === 'admin' ? '👑 Admin' : '👤 Member'}
  </span>
);

/* ─── Add Member Modal ────────────────────────────────── */
const AddMemberModal = ({ tenantName, onClose, onSuccess }) => {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'member' });
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    setError(null);
    if (!form.username || !form.email || !form.password) return setError('All fields are required.');
    if (form.password !== confirm) return setError('Passwords do not match.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');

    setLoading(true);
    try {
      const res = await api.post('/team/', form);
      onSuccess(res.data.member, res.data.message);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: '1rem',
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '2rem', position: 'relative' }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1rem', right: '1rem', background: 'none',
          border: 'none', color: 'var(--text-secondary)', fontSize: '1.4rem', cursor: 'pointer',
        }}>×</button>

        <h2 style={{ marginTop: 0, marginBottom: '0.25rem', fontSize: '1.1rem' }}>
          👥 Add Team Member
        </h2>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Adding to <strong style={{ color: 'var(--brand-primary)' }}>{tenantName}</strong> workspace.
          They can log in immediately with these credentials.
        </p>

        {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="input-group">
          <label className="input-label">Username</label>
          <input type="text" className="form-input" placeholder="e.g. john_doe"
            value={form.username}
            onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g, '_'))} />
        </div>

        <div className="input-group">
          <label className="input-label">Email Address</label>
          <input type="email" className="form-input" placeholder="john@yourcompany.com"
            value={form.email}
            onChange={e => set('email', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input type="password" className="form-input" placeholder="Min. 6 chars"
              value={form.password}
              onChange={e => set('password', e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Confirm Password</label>
            <input type="password" className="form-input" placeholder="Retype"
              value={confirm}
              onChange={e => setConfirm(e.target.value)} />
          </div>
        </div>
        {confirm && (
          <p style={{ margin: '-0.5rem 0 0.75rem', fontSize: '0.76rem',
            color: form.password === confirm ? '#10b981' : '#ef4444' }}>
            {form.password === confirm ? '✓ Passwords match' : '✗ Do not match'}
          </p>
        )}

        <div className="input-group">
          <label className="input-label">Role</label>
          <select className="form-input form-select" value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="member">Member — Can view and upload documents</option>
            <option value="admin">Admin — Full workspace control</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleAdd} disabled={loading}>
            {loading
              ? <><span className="loader" style={{ width: 14, height: 14, borderWidth: 2 }}></span> Adding...</>
              : '✅ Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Team Page ───────────────────────────────────────── */
const Team = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const { sidebarOpen, toggleSidebar, closeSidebar } = useMobileSidebar();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTeam = async () => {
    try {
      const [teamRes, dashRes] = await Promise.all([
        api.get('/team/'),
        api.get('/dashboard/'),
      ]);
      setTeamData(teamRes.data);
      setTenantName(dashRes.data.tenant?.name || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleAddSuccess = (newMember, message) => {
    setShowModal(false);
    showToast(message);
    fetchTeam();
  };

  const handleRemove = async (member) => {
    if (!window.confirm(`Remove "${member.username}" from the workspace?`)) return;
    setRemovingId(member.id);
    try {
      const res = await api.delete(`/team/${member.id}/`);
      showToast(res.data.message);
      fetchTeam();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to remove member.', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return (
    <div className="auth-container">
      <span className="loader" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></span>
    </div>
  );

  const usedSlots = teamData?.current_count ?? 0;
  const totalSlots = teamData?.user_limit ?? 5;
  const slotsLeft = teamData?.slots_remaining ?? 0;
  const slotPercent = Math.round((usedSlots / totalSlots) * 100);
  const slotColor = slotPercent >= 90 ? 'var(--brand-danger)' : slotPercent >= 60 ? 'var(--brand-warning)' : 'var(--brand-success)';

  const Sidebar = () => (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div style={{ padding: '8px 16px 4px' }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{tenantName}</p>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', paddingBottom: '16px' }}>Workspace</p>
      </div>
      <nav style={{ flex: 1 }}>
        <Link onClick={closeSidebar} to="/dashboard" className="sidebar-nav-item">📊 Dashboard</Link>
        <Link onClick={closeSidebar} to="/billing" className="sidebar-nav-item">💳 Billing</Link>
        <Link onClick={closeSidebar} to="/documents" className="sidebar-nav-item">📄 Documents</Link>
        <Link onClick={closeSidebar} to="/editor/0" className="sidebar-nav-item">✏️ Collab Editor</Link>
        <button onClick={closeSidebar} className="sidebar-nav-item active">👥 Team</button>
        <Link onClick={closeSidebar} to="/settings" className="sidebar-nav-item">⚙️ Settings</Link>
      </nav>
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--sidebar-border)', padding: '12px 16px' }}>
        <div style={{ marginBottom: '8px' }}>
          <p style={{ margin: 0, fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)' }}>{user?.username}</p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{user?.role}</p>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }}
          style={{ width: '100%', padding: '8px', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: 'var(--brand-danger)', background: 'transparent', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s', marginTop: '8px' }}
          onMouseEnter={e => e.target.style.background='rgba(239,68,68,0.08)'}
          onMouseLeave={e => e.target.style.background='transparent'}
        >
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
        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 2000,
            background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
            border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
            color: toast.type === 'error' ? '#f87171' : '#34d399',
            padding: '0.85rem 1.25rem', borderRadius: '12px',
            backdropFilter: 'blur(8px)', animation: 'fadeIn 0.3s ease',
          }}>
            {toast.msg}
          </div>
        )}

        <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Team Members</h1>
            <p style={{ margin: 0 }}>Manage who has access to your <strong>{tenantName}</strong> workspace.</p>
          </div>
          {user?.role === 'admin' && slotsLeft > 0 && (
            <button className="btn btn-primary"
              onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ➕ Add Member
            </button>
          )}
        </header>

        {/* Slot Usage Card */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              User Slots — <strong style={{ color: slotColor }}>{usedSlots} / {totalSlots}</strong> used
            </p>
            <span style={{
              fontSize: '0.78rem', padding: '0.2rem 0.7rem', borderRadius: '999px',
              background: slotsLeft === 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.1)',
              color: slotColor, fontWeight: 600,
            }}>
              {slotsLeft === 0 ? '⚠️ Limit Reached' : `${slotsLeft} slot${slotsLeft !== 1 ? 's' : ''} remaining`}
            </span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${slotPercent}%`,
              background: slotColor, borderRadius: '3px', transition: 'width 0.5s ease',
            }} />
          </div>
          {slotsLeft === 0 && (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: '#f59e0b' }}>
              ⚡ Upgrade your plan in <Link to="/billing" style={{ color: 'var(--brand-primary)' }}>Billing</Link> to add more members.
            </p>
          )}
        </div>

        {/* Members Table */}
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          {!teamData?.members?.length ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
              <h3>No team members yet</h3>
              <p>Click "Add Member" to invite your first employee.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Member', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamData.members.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }}
                    className="table-row-hover">
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--brand-primary), #7c3aed)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, color: 'white', fontSize: '0.9rem', flexShrink: 0,
                        }}>
                          {m.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 500 }}>{m.username}</p>
                          {m.id === user?.id && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>you</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{m.email}</td>
                    <td style={{ padding: '1rem 1.5rem' }}><RoleBadge role={m.role} /></td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{m.date_joined}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {user?.role === 'admin' && m.id !== user?.id ? (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                          onClick={() => handleRemove(m)}
                          disabled={removingId === m.id}>
                          {removingId === m.id ? '...' : '🗑 Remove'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {showModal && (
        <AddMemberModal
          tenantName={tenantName}
          onClose={() => setShowModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
};

export default Team;
