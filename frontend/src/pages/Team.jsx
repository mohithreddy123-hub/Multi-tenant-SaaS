import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api';
import { Users, UserPlus, Crown, User, Trash2, X, AlertTriangle } from 'lucide-react';

/* ─── Role Badge ──────────────────────────────────────── */
const RoleBadge = ({ role }) => (
  <span className={`tv-badge ${role === 'admin' ? 'tv-badge-info' : 'tv-badge-success'}`}>
    {role === 'admin' ? <><Crown size={11} /> Admin</> : <><User size={11} /> Member</>}
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
    <div className="tv-modal-overlay" onClick={onClose}>
      <div className="tv-modal" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
        <button className="tv-modal-close" onClick={onClose}><X size={18} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserPlus size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Add Team Member</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Adding to <strong style={{ color: 'var(--accent)' }}>{tenantName}</strong>
            </p>
          </div>
        </div>

        {error && <div className="tv-error">{error}</div>}

        <div className="tv-input-group">
          <label className="tv-label">Username</label>
          <input type="text" className="tv-input" placeholder="e.g. john_doe"
            value={form.username} onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g, '_'))} />
        </div>
        <div className="tv-input-group">
          <label className="tv-label">Email Address</label>
          <input type="email" className="tv-input" placeholder="john@yourcompany.com"
            value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="tv-input-group">
            <label className="tv-label">Password</label>
            <input type="password" className="tv-input" placeholder="Min. 6 chars"
              value={form.password} onChange={e => set('password', e.target.value)} />
          </div>
          <div className="tv-input-group">
            <label className="tv-label">Confirm Password</label>
            <input type="password" className="tv-input" placeholder="Retype"
              value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
        </div>
        {confirm && (
          <p style={{ margin: '-0.5rem 0 0.75rem', fontSize: '0.76rem',
            color: form.password === confirm ? 'var(--success)' : 'var(--error)' }}>
            {form.password === confirm ? '✓ Passwords match' : '✗ Do not match'}
          </p>
        )}
        <div className="tv-input-group">
          <label className="tv-label">Role</label>
          <select className="tv-input tv-select" value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="member">Member — Can view and upload documents</option>
            <option value="admin">Admin — Full workspace control</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button className="tv-btn tv-btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="tv-btn tv-btn-primary" style={{ flex: 2 }} onClick={handleAdd} disabled={loading}>
            {loading ? <><div className="tv-loader" style={{ width: 14, height: 14, borderWidth: 2 }} /> Adding...</> : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Team Page ───────────────────────────────────────── */
const Team = () => {
  const { user } = useContext(AuthContext);
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [removingId, setRemovingId] = useState(null);

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="tv-loader" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  const usedSlots = teamData?.current_count ?? 0;
  const totalSlots = teamData?.user_limit ?? 5;
  const slotsLeft = teamData?.slots_remaining ?? 0;
  const slotPercent = Math.round((usedSlots / totalSlots) * 100);
  const slotColor = slotsLeft === 0 ? 'var(--error)' : slotsLeft <= 2 ? 'var(--warning)' : 'var(--success)';

  return (
    <div className="animate-in">
      {/* Toast */}
      {toast && (
        <div className={`tv-toast ${toast.type === 'error' ? 'tv-toast-error' : 'tv-toast-success'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="tv-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="tv-page-title">Team Members</h1>
          <p className="tv-page-desc">Manage who has access to your <strong>{tenantName}</strong> workspace.</p>
        </div>
        {user?.role === 'admin' && slotsLeft > 0 && (
          <button className="tv-btn tv-btn-primary" onClick={() => setShowModal(true)}>
            <UserPlus size={16} /> Add Member
          </button>
        )}
      </div>

      {/* Slot Usage */}
      <div className="tv-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            User Slots — <strong style={{ color: slotColor }}>{usedSlots} / {totalSlots}</strong> used
          </span>
          <span className={`tv-badge ${slotsLeft === 0 ? 'tv-badge-error' : 'tv-badge-success'}`}>
            {slotsLeft === 0 ? <><AlertTriangle size={11} /> Limit Reached</> : `${slotsLeft} remaining`}
          </span>
        </div>
        <div className="tv-progress">
          <div className="tv-progress-fill" style={{ width: `${slotPercent}%`, background: slotColor }} />
        </div>
        {slotsLeft === 0 && (
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: 'var(--warning)' }}>
            Upgrade your plan in <Link to="/billing" style={{ color: 'var(--accent)' }}>Billing</Link> to add more members.
          </p>
        )}
      </div>

      {/* Members Table */}
      <div className="tv-card" style={{ padding: 0, overflow: 'hidden' }}>
        {!teamData?.members?.length ? (
          <div className="tv-empty">
            <div className="tv-empty-icon"><Users size={48} /></div>
            <h3>No team members yet</h3>
            <p>Click "Add Member" to invite your first employee.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tv-table">
              <thead>
                <tr>
                  {['Member', 'Email', 'Role', 'Joined', 'Actions'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {teamData.members.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="tv-avatar">{m.username[0].toUpperCase()}</div>
                        <div>
                          <span style={{ fontWeight: 500 }}>{m.username}</span>
                          {m.id === user?.id && <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginLeft: 6 }}>you</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{m.email}</td>
                    <td><RoleBadge role={m.role} /></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{m.date_joined}</td>
                    <td>
                      {user?.role === 'admin' && m.id !== user?.id ? (
                        <button className="tv-btn tv-btn-danger" style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
                          onClick={() => handleRemove(m)} disabled={removingId === m.id}>
                          {removingId === m.id ? '...' : <><Trash2 size={13} /> Remove</>}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
