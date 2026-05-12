import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../api';
import { User, Lock, Building2, CreditCard, Bell, AlertTriangle, Monitor, Check } from 'lucide-react';

/* ─── Feedback Banner ────────────────────────────────── */
const Banner = ({ msg }) => {
    if (!msg) return null;
    const isError = msg.type === 'error';
    return (
        <div style={{
            padding: '0.7rem 1rem', borderRadius: '8px', marginBottom: '1rem',
            background: isError ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
            borderLeft: `3px solid ${isError ? 'var(--error)' : 'var(--success)'}`,
            color: isError ? 'var(--error)' : 'var(--success)',
            fontSize: '0.85rem', fontWeight: 500,
        }}>
            {msg.text}
        </div>
    );
};

const planMeta = {
    starter:    { color: '#6b7280', label: 'Starter', price: '$99/mo', users: 5,
        features: ['Zero-Knowledge Privacy', 'Secure Document Vault', 'Real-time Live Sync'] },
    growth:     { color: '#6366f1', label: 'Growth', price: '$299/mo', users: 20,
        features: ['Zero-Knowledge Privacy', 'Internal Team Chat', 'Advanced Real-time Sync', 'Live Update Notifications'] },
    enterprise: { color: '#f59e0b', label: 'Enterprise', price: '$999/mo', users: 'Unlimited',
        features: ['Dedicated Privacy Node', 'Advanced Access Controls', 'Priority Team Channels', 'Dedicated Account Rep'] },
};

const Settings = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');

    const [profile, setProfile] = useState({ username: user?.username || '', email: user?.email || '' });
    const [profileMsg, setProfileMsg] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);

    const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [passMsg, setPassMsg] = useState(null);
    const [passLoading, setPassLoading] = useState(false);

    const [workspace, setWorkspace] = useState({ name: user?.tenant?.name || '' });
    const [workspaceMsg, setWorkspaceMsg] = useState(null);
    const [workspaceLoading, setWorkspaceLoading] = useState(false);

    const [notifications, setNotifications] = useState({
        email_login: true, email_upload: true, email_invoice: true, email_storage_alert: true,
    });

    const [deactivateConfirm, setDeactivateConfirm] = useState('');

    const tabs = [
        { id: 'profile',   icon: User,           label: 'Profile' },
        { id: 'security',  icon: Lock,            label: 'Security' },
        { id: 'workspace', icon: Building2,       label: 'Workspace' },
        { id: 'plan',      icon: CreditCard,      label: 'Billing & Plan' },
        { id: 'notifs',    icon: Bell,             label: 'Notifications' },
        { id: 'danger',    icon: AlertTriangle,    label: 'Danger Zone' },
    ];

    const handleProfileSave = async () => {
        setProfileLoading(true); setProfileMsg(null);
        try {
            const res = await api.patch('/settings/profile/', profile);
            setProfileMsg({ type: 'success', text: res.data.message });
        } catch (err) {
            setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update profile.' });
        } finally { setProfileLoading(false); }
    };

    const handlePasswordSave = async () => {
        if (passwords.new_password !== passwords.confirm_password) {
            return setPassMsg({ type: 'error', text: 'New passwords do not match.' });
        }
        setPassLoading(true); setPassMsg(null);
        try {
            const res = await api.patch('/settings/password/', {
                current_password: passwords.current_password, new_password: passwords.new_password,
            });
            setPassMsg({ type: 'success', text: res.data.message });
            setPasswords({ current_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => { logout(); navigate('/login'); }, 2000);
        } catch (err) {
            setPassMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to change password.' });
        } finally { setPassLoading(false); }
    };

    const handleWorkspaceSave = async () => {
        setWorkspaceLoading(true); setWorkspaceMsg(null);
        try {
            const res = await api.patch('/settings/workspace/', workspace);
            setWorkspaceMsg({ type: 'success', text: res.data.message });
        } catch (err) {
            setWorkspaceMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update workspace.' });
        } finally { setWorkspaceLoading(false); }
    };

    const currentPlan = planMeta[user?.tenant?.plan] || planMeta.starter;

    const ToggleSwitch = ({ checked, onChange }) => (
        <div onClick={onChange} style={{
            width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
            background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}>
            <div style={{
                position: 'absolute', top: 3, left: checked ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
        </div>
    );

    return (
        <div className="animate-in">
            <div className="tv-page-header">
                <h1 className="tv-page-title">Settings</h1>
                <p className="tv-page-desc">Manage your account, security, and workspace preferences.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1.5rem', alignItems: 'start' }}>
                {/* Tabs */}
                <div className="tv-card" style={{ padding: '0.5rem' }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="tv-btn tv-btn-ghost"
                                style={{
                                    width: '100%', justifyContent: 'flex-start', borderRadius: 8, marginBottom: 2, padding: '0.55rem 0.75rem',
                                    background: activeTab === tab.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                                    color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                                    fontWeight: activeTab === tab.id ? 600 : 400,
                                }}>
                                <Icon size={15} /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Panels */}
                <div>
                    {/* PROFILE */}
                    {activeTab === 'profile' && (
                        <div className="tv-card">
                            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Public Profile</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>How others see you on TenantVault.</p>
                            <Banner msg={profileMsg} />
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', alignItems: 'center' }}>
                                <div className="tv-avatar" style={{ width: 56, height: 56, fontSize: '1.4rem', borderRadius: 14 }}>
                                    {user?.username?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 600 }}>{user?.username}</p>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user?.email}</p>
                                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'capitalize' }}>{user?.role} · {user?.tenant?.name}</p>
                                </div>
                            </div>
                            <div className="tv-input-group">
                                <label className="tv-label">Display Name</label>
                                <input type="text" className="tv-input" value={profile.username}
                                    onChange={e => setProfile({ ...profile, username: e.target.value })} />
                            </div>
                            <div className="tv-input-group">
                                <label className="tv-label">Email Address</label>
                                <input type="email" className="tv-input" value={profile.email}
                                    onChange={e => setProfile({ ...profile, email: e.target.value })} />
                            </div>
                            <button className="tv-btn tv-btn-primary" onClick={handleProfileSave} disabled={profileLoading}>
                                {profileLoading ? 'Saving...' : 'Save Profile'}
                            </button>
                        </div>
                    )}

                    {/* SECURITY */}
                    {activeTab === 'security' && (
                        <div className="tv-card">
                            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Password & Security</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>You will be logged out after a password change.</p>
                            <Banner msg={passMsg} />
                            <div className="tv-input-group">
                                <label className="tv-label">Current Password</label>
                                <input type="password" className="tv-input" placeholder="••••••••" value={passwords.current_password}
                                    onChange={e => setPasswords({ ...passwords, current_password: e.target.value })} />
                            </div>
                            <div className="tv-input-group">
                                <label className="tv-label">New Password</label>
                                <input type="password" className="tv-input" placeholder="Min. 8 characters" value={passwords.new_password}
                                    onChange={e => setPasswords({ ...passwords, new_password: e.target.value })} />
                            </div>
                            <div className="tv-input-group">
                                <label className="tv-label">Confirm New Password</label>
                                <input type="password" className="tv-input" placeholder="Repeat new password" value={passwords.confirm_password}
                                    onChange={e => setPasswords({ ...passwords, confirm_password: e.target.value })} />
                            </div>
                            <button className="tv-btn tv-btn-primary" onClick={handlePasswordSave} disabled={passLoading}>
                                {passLoading ? 'Saving...' : 'Change Password'}
                            </button>
                            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Active Sessions</h4>
                                <div style={{ background: 'rgba(99,102,241,0.06)', borderRadius: 8, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Monitor size={16} style={{ color: 'var(--text-secondary)' }} />
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.85rem' }}>This Device</p>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Active now</p>
                                        </div>
                                    </div>
                                    <span className="tv-badge tv-badge-success">ACTIVE</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* WORKSPACE */}
                    {activeTab === 'workspace' && (
                        <div className="tv-card">
                            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Workspace Settings</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>Admin access required.</p>
                            <Banner msg={workspaceMsg} />
                            {user?.role !== 'admin' && (
                                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '0.7rem 1rem', marginBottom: '1rem', color: 'var(--warning)', fontSize: '0.82rem' }}>
                                    You are viewing as a read-only member.
                                </div>
                            )}
                            <div className="tv-input-group">
                                <label className="tv-label">Company / Workspace Name</label>
                                <input type="text" className="tv-input" value={workspace.name}
                                    onChange={e => setWorkspace({ ...workspace, name: e.target.value })} disabled={user?.role !== 'admin'} />
                            </div>
                            <div className="tv-input-group">
                                <label className="tv-label">Domain (auto-generated)</label>
                                <input type="text" className="tv-input" value={user?.tenant?.domain || ''} disabled style={{ opacity: 0.5 }} />
                            </div>
                            <div className="tv-input-group">
                                <label className="tv-label">Current Plan</label>
                                <input type="text" className="tv-input" value={`${currentPlan.label} — Up to ${currentPlan.users} users`} disabled style={{ opacity: 0.5 }} />
                            </div>
                            {user?.role === 'admin' && (
                                <button className="tv-btn tv-btn-primary" onClick={handleWorkspaceSave} disabled={workspaceLoading}>
                                    {workspaceLoading ? 'Saving...' : 'Save Workspace'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* BILLING */}
                    {activeTab === 'plan' && (
                        <div className="tv-card">
                            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem' }}>Billing & Subscription</h3>
                            <div className="tv-grid tv-grid-3" style={{ marginBottom: '1.5rem' }}>
                                {Object.entries(planMeta).map(([key, p]) => {
                                    const isActive = user?.tenant?.plan === key;
                                    return (
                                        <div key={key} style={{
                                            padding: '1.25rem', borderRadius: 'var(--radius)',
                                            border: `2px solid ${isActive ? p.color : 'var(--border)'}`,
                                            background: isActive ? `color-mix(in srgb, ${p.color} 6%, transparent)` : 'transparent',
                                            position: 'relative',
                                        }}>
                                            {isActive && <span className="tv-badge" style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: p.color, color: 'white' }}>CURRENT</span>}
                                            <h4 style={{ margin: '0 0 0.25rem', color: p.color }}>{p.label}</h4>
                                            <p style={{ margin: '0 0 0.75rem', fontSize: '1.2rem', fontWeight: 700 }}>{p.price}</p>
                                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Up to {p.users} users</p>
                                            {p.features.map((f, i) => (
                                                <p key={i} style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Check size={12} style={{ color: 'var(--success)' }} /> {f}
                                                </p>
                                            ))}
                                            {!isActive && <button className="tv-btn tv-btn-secondary" style={{ width: '100%', marginTop: '1rem', fontSize: '0.8rem' }}>Upgrade →</button>}
                                        </div>
                                    );
                                })}
                            </div>
                            <Link to="/billing" className="tv-btn tv-btn-primary" style={{ textDecoration: 'none' }}>View & Pay Invoices</Link>
                        </div>
                    )}

                    {/* NOTIFICATIONS */}
                    {activeTab === 'notifs' && (
                        <div className="tv-card">
                            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem' }}>Notification Preferences</h3>
                            {[
                                { key: 'email_login', label: 'New Login Alert', desc: 'Notified when logged in from a new device.' },
                                { key: 'email_upload', label: 'Document Upload', desc: 'Email when a new file is uploaded.' },
                                { key: 'email_invoice', label: 'Invoice Generated', desc: 'Receive billing invoice by email.' },
                                { key: 'email_storage_alert', label: 'Security Alerts', desc: 'Alert on suspicious access attempts.' },
                            ].map(item => (
                                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0', borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: 500, fontSize: '0.88rem' }}>{item.label}</p>
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.desc}</p>
                                    </div>
                                    <ToggleSwitch checked={notifications[item.key]}
                                        onChange={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key] }))} />
                                </div>
                            ))}
                            <button className="tv-btn tv-btn-primary" style={{ marginTop: '1.5rem' }}>Save Preferences</button>
                        </div>
                    )}

                    {/* DANGER ZONE */}
                    {activeTab === 'danger' && (
                        <div className="tv-card">
                            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', color: 'var(--error)' }}>Danger Zone</h3>
                            <div style={{ border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1rem', background: 'rgba(239,68,68,0.03)' }}>
                                <h4 style={{ margin: '0 0 0.5rem', color: 'var(--error)', fontSize: '0.9rem' }}>Deactivate Account</h4>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
                                    Your data will be retained for 30 days before permanent deletion.
                                </p>
                                <div className="tv-input-group">
                                    <label className="tv-label">Type your username to confirm: <strong>{user?.username}</strong></label>
                                    <input type="text" className="tv-input" placeholder={user?.username} value={deactivateConfirm}
                                        onChange={e => setDeactivateConfirm(e.target.value)} />
                                </div>
                                <button className="tv-btn tv-btn-danger" disabled={deactivateConfirm !== user?.username}
                                    style={{ opacity: deactivateConfirm === user?.username ? 1 : 0.4 }}>
                                    Permanently Deactivate Account
                                </button>
                            </div>
                            {user?.role === 'admin' && (
                                <div style={{ border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius)', padding: '1.5rem', background: 'rgba(239,68,68,0.04)' }}>
                                    <h4 style={{ margin: '0 0 0.5rem', color: 'var(--error)', fontSize: '0.9rem' }}>Delete Entire Workspace</h4>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
                                        This will permanently delete <strong>{user?.tenant?.name}</strong> and all its data.
                                    </p>
                                    <button className="tv-btn tv-btn-danger" disabled>Contact Support to Delete</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
