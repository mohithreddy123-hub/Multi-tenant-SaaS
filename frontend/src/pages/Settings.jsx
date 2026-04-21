import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../api';
import { useMobileSidebar } from '../hooks/useMobileSidebar';

/* ─── Reusable Section Card ─────────────────────────── */
const SettingsSection = ({ icon, title, subtitle, children }) => (
    <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '1.4rem' }}>{icon}</span>
            <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{subtitle}</p>
            </div>
        </div>
        {children}
    </div>
);

/* ─── Feedback Banner ────────────────────────────────── */
const Banner = ({ msg }) => {
    if (!msg) return null;
    const isError = msg.type === 'error';
    return (
        <div style={{
            padding: '0.75rem 1.25rem', borderRadius: '8px', marginBottom: '1rem',
            background: isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            borderLeft: `3px solid ${isError ? 'var(--accent-error)' : 'var(--accent-success)'}`,
            color: isError ? 'var(--accent-error)' : 'var(--accent-success)',
            fontSize: '0.88rem', fontWeight: 500,
        }}>
            {isError ? '❌ ' : '✅ '}{msg.text}
        </div>
    );
};

/* ─── Plan Badge ─────────────────────────────────────── */
const planMeta = {
    starter: { 
        color: '#6b7280', label: 'Starter', price: '$99/mo', users: 5,
        features: ['🛡️ Zero-Knowledge Privacy', '🔒 Secure Document Vault', '⚡ Real-time Live Sync']
    },
    growth: { 
        color: '#6366f1', label: 'Growth', price: '$299/mo', users: 20,
        features: ['🛡️ Zero-Knowledge Privacy', '💬 Internal Team Chat', '⚡ Advanced Real-time Sync', '🔔 Live Update Notifications']
    },
    enterprise: { 
        color: '#f59e0b', label: 'Enterprise', price: '$999/mo', users: 'Unlimited',
        features: ['🛡️ Dedicated Privacy Node', '🏢 Advanced Access Controls', '💬 Priority Team Channels', '🤝 Dedicated Account Rep']
    },
};

/* ─── Main Settings Page ─────────────────────────────── */
const Settings = () => {
    const { user, logout, updateUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const { sidebarOpen, toggleSidebar, closeSidebar } = useMobileSidebar();

    // Active section tab
    const [activeTab, setActiveTab] = useState('profile');

    // Profile state
    const [profile, setProfile] = useState({ username: user?.username || '', email: user?.email || '' });
    const [profileMsg, setProfileMsg] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);

    // Password state
    const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [passMsg, setPassMsg] = useState(null);
    const [passLoading, setPassLoading] = useState(false);

    // Workspace state
    const [workspace, setWorkspace] = useState({ name: user?.tenant?.name || '' });
    const [workspaceMsg, setWorkspaceMsg] = useState(null);
    const [workspaceLoading, setWorkspaceLoading] = useState(false);

    // Notifications (local toggle only for now)
    const [notifications, setNotifications] = useState({
        email_login: true,
        email_upload: true,
        email_invoice: true,
        email_storage_alert: true,
    });

    // Danger Zone
    const [deactivateConfirm, setDeactivateConfirm] = useState('');

    const tabs = [
        { id: 'profile',    icon: '👤', label: 'Profile'       },
        { id: 'security',   icon: '🔐', label: 'Security'      },
        { id: 'workspace',  icon: '🏢', label: 'Workspace'     },
        { id: 'plan',       icon: '💳', label: 'Billing & Plan' },
        { id: 'notifs',     icon: '🔔', label: 'Notifications' },
        { id: 'danger',     icon: '⚠️', label: 'Danger Zone'   },
    ];

    /* ── Handlers ── */
    const handleProfileSave = async () => {
        setProfileLoading(true);
        setProfileMsg(null);
        try {
            const res = await api.patch('/settings/profile/', profile);
            setProfileMsg({ type: 'success', text: res.data.message });
        } catch (err) {
            setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update profile.' });
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSave = async () => {
        if (passwords.new_password !== passwords.confirm_password) {
            return setPassMsg({ type: 'error', text: 'New passwords do not match.' });
        }
        setPassLoading(true);
        setPassMsg(null);
        try {
            const res = await api.patch('/settings/password/', {
                current_password: passwords.current_password,
                new_password: passwords.new_password,
            });
            setPassMsg({ type: 'success', text: res.data.message });
            setPasswords({ current_password: '', new_password: '', confirm_password: '' });
            // Force re-login after password change
            setTimeout(() => { logout(); navigate('/login'); }, 2000);
        } catch (err) {
            setPassMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to change password.' });
        } finally {
            setPassLoading(false);
        }
    };

    const handleWorkspaceSave = async () => {
        setWorkspaceLoading(true);
        setWorkspaceMsg(null);
        try {
            const res = await api.patch('/settings/workspace/', workspace);
            setWorkspaceMsg({ type: 'success', text: res.data.message });
        } catch (err) {
            setWorkspaceMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update workspace.' });
        } finally {
            setWorkspaceLoading(false);
        }
    };

    const currentPlan = planMeta[user?.tenant?.plan] || planMeta.starter;

    return (
        <div className="app-layout">
            {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}
            <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
            {/* ── Sidebar ── */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ color: 'var(--brand-primary)', margin: 0 }}>TenantVault</h2>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Account Settings</p>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Link onClick={closeSidebar} to="/dashboard" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>📊 Dashboard</Link>
                    <Link onClick={closeSidebar} to="/billing"   className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>💳 Billing</Link>
                    <Link onClick={closeSidebar} to="/documents" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>📄 Documents</Link>
                    <Link onClick={closeSidebar} to="/editor/0"  className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>✏️ Collab Editor</Link>
                    <button onClick={closeSidebar} className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', background: 'rgba(99,102,241,0.15)', color: 'var(--brand-primary)' }}>
                        ⚙️ Settings
                    </button>
                </nav>

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

            {/* ── Main Content ── */}
            <main className="main-content">
                <header className="page-header">
                    <div>
                        <h1>Settings</h1>
                        <p style={{ margin: 0 }}>Manage your account, security, and workspace preferences.</p>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'start' }}>

                    {/* ── Settings Tabs ── */}
                    <div className="glass-panel" style={{ padding: '0.5rem' }}>
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className="btn btn-secondary"
                                style={{
                                    width: '100%', justifyContent: 'flex-start', border: 'none',
                                    borderRadius: '8px', marginBottom: '2px',
                                    background: activeTab === tab.id ? 'rgba(99,102,241,0.18)' : 'transparent',
                                    color: activeTab === tab.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                    fontWeight: activeTab === tab.id ? 600 : 400,
                                }}>
                                {tab.icon} &nbsp; {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Settings Panels ── */}
                    <div>

                        {/* ── PROFILE ── */}
                        {activeTab === 'profile' && (
                            <SettingsSection icon="👤" title="Public Profile" subtitle="This is how others see you on TenantVault.">
                                <Banner msg={profileMsg} />
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>
                                        {user?.username?.[0]?.toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>{user?.username}</p>
                                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{user?.email}</p>
                                        <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'var(--brand-primary)', textTransform: 'capitalize' }}>
                                            {user?.role} · {user?.tenant?.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Display Name / Username</label>
                                    <input type="text" className="form-input" value={profile.username}
                                        onChange={e => setProfile({ ...profile, username: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Email Address</label>
                                    <input type="email" className="form-input" value={profile.email}
                                        onChange={e => setProfile({ ...profile, email: e.target.value })} />
                                </div>
                                <button className="btn btn-primary" onClick={handleProfileSave} disabled={profileLoading}>
                                    {profileLoading ? 'Saving...' : 'Save Profile'}
                                </button>
                            </SettingsSection>
                        )}

                        {/* ── SECURITY ── */}
                        {activeTab === 'security' && (
                            <SettingsSection icon="🔐" title="Password & Security" subtitle="Change your login credentials. You will be logged out after a password change.">
                                <Banner msg={passMsg} />
                                <div className="input-group">
                                    <label className="input-label">Current Password</label>
                                    <input type="password" className="form-input" placeholder="••••••••"
                                        value={passwords.current_password}
                                        onChange={e => setPasswords({ ...passwords, current_password: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">New Password</label>
                                    <input type="password" className="form-input" placeholder="Min. 8 characters"
                                        value={passwords.new_password}
                                        onChange={e => setPasswords({ ...passwords, new_password: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Confirm New Password</label>
                                    <input type="password" className="form-input" placeholder="Repeat new password"
                                        value={passwords.confirm_password}
                                        onChange={e => setPasswords({ ...passwords, confirm_password: e.target.value })} />
                                </div>

                                {/* Password strength */}
                                {passwords.new_password.length > 0 && (
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                            {[1,2,3,4].map(i => (
                                                <div key={i} style={{
                                                    flex: 1, height: '4px', borderRadius: '2px',
                                                    background: passwords.new_password.length >= i * 3
                                                        ? (passwords.new_password.length >= 12 ? 'var(--accent-success)' : '#f59e0b')
                                                        : 'var(--border-light)',
                                                }} />
                                            ))}
                                        </div>
                                        <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-secondary)' }}>
                                            {passwords.new_password.length < 4 ? 'Too short' : passwords.new_password.length < 8 ? 'Weak' : passwords.new_password.length < 12 ? 'Good' : 'Strong'}
                                        </p>
                                    </div>
                                )}

                                <button className="btn btn-primary" onClick={handlePasswordSave} disabled={passLoading}>
                                    {passLoading ? 'Saving...' : '🔒 Change Password'}
                                </button>

                                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
                                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>🔑 Active Sessions</h4>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>You are currently logged in on this device.</p>
                                    <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.88rem' }}>💻 This Device</p>
                                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Windows · Chrome · Active now</p>
                                        </div>
                                        <span style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-success)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>ACTIVE</span>
                                    </div>
                                </div>
                            </SettingsSection>
                        )}

                        {/* ── WORKSPACE ── */}
                        {activeTab === 'workspace' && (
                            <SettingsSection icon="🏢" title="Workspace Settings" subtitle="Manage your company workspace. Admin access required.">
                                <Banner msg={workspaceMsg} />
                                {user?.role !== 'admin' && (
                                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#f59e0b', fontSize: '0.85rem' }}>
                                        ⚠️ You are viewing as a <strong>read-only</strong> member. Ask your workspace Admin to make changes.
                                    </div>
                                )}
                                <div className="input-group">
                                    <label className="input-label">Company / Workspace Name</label>
                                    <input type="text" className="form-input"
                                        value={workspace.name}
                                        onChange={e => setWorkspace({ ...workspace, name: e.target.value })}
                                        disabled={user?.role !== 'admin'} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Workspace Domain (auto-generated)</label>
                                    <input type="text" className="form-input" value={user?.tenant?.domain || ''} disabled style={{ opacity: 0.5 }} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Current Plan</label>
                                    <input type="text" className="form-input" value={`${currentPlan.label} Plan — Up to ${currentPlan.users} users`} disabled style={{ opacity: 0.5 }} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Member Count</label>
                                    <input type="text" className="form-input" value={`${user?.tenant?.user_limit} user slots`} disabled style={{ opacity: 0.5 }} />
                                </div>
                                {user?.role === 'admin' && (
                                    <button className="btn btn-primary" onClick={handleWorkspaceSave} disabled={workspaceLoading}>
                                        {workspaceLoading ? 'Saving...' : '🏢 Save Workspace'}
                                    </button>
                                )}
                            </SettingsSection>
                        )}

                        {/* ── BILLING & PLAN ── */}
                        {activeTab === 'plan' && (
                            <SettingsSection icon="💳" title="Billing & Subscription" subtitle="View your current plan and available upgrades.">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                                    {Object.entries(planMeta).map(([key, p]) => {
                                        const isActive = user?.tenant?.plan === key;
                                        return (
                                            <div key={key} style={{
                                                padding: '1.25rem', borderRadius: '12px',
                                                border: `2px solid ${isActive ? p.color : 'var(--border-light)'}`,
                                                background: isActive ? `rgba(${key === 'starter' ? '107,114,128' : key === 'growth' ? '99,102,241' : '245,158,11'},0.08)` : 'transparent',
                                                position: 'relative',
                                            }}>
                                                {isActive && (
                                                    <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: p.color, color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '10px' }}>CURRENT</span>
                                                )}
                                                <h4 style={{ margin: '0 0 0.25rem', color: p.color }}>{p.label}</h4>
                                                <p style={{ margin: '0 0 0.75rem', fontSize: '1.2rem', fontWeight: 700 }}>{p.price}</p>
                                                <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>👥 Up to {p.users} users</p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                                                    {p.features.map((feat, i) => (
                                                        <p key={i} style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{feat}</p>
                                                    ))}
                                                </div>
                                                {!isActive && (
                                                    <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem', fontSize: '0.8rem' }}>
                                                        Upgrade →
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <Link to="/billing" className="btn btn-primary" style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                                    💳 View & Pay Invoices
                                </Link>
                            </SettingsSection>
                        )}

                        {/* ── NOTIFICATIONS ── */}
                        {activeTab === 'notifs' && (
                            <SettingsSection icon="🔔" title="Notification Preferences" subtitle="Control which email alerts you receive from TenantVault.">
                                {[
                                    { key: 'email_login',         label: '🔑 New Login Alert',         desc: 'Get notified when your account is logged into from a new device.' },
                                    { key: 'email_upload',        label: '📄 Document Upload',           desc: 'Email when a new file is uploaded in your workspace.' },
                                    { key: 'email_invoice',       label: '💳 Invoice Generated',         desc: 'Receive a copy of each billing invoice by email.' },
                                    { key: 'email_security_alert',label: '🛡️ Security Alerts',          desc: 'Alert when a suspicious login or access attempt occurs.' },
                                ].map(item => (
                                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid var(--border-light)' }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem' }}>{item.label}</p>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.desc}</p>
                                        </div>
                                        {/* Toggle Switch */}
                                        <div onClick={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key] }))}
                                            style={{
                                                width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
                                                background: notifications[item.key] ? 'var(--brand-primary)' : 'var(--border-light)',
                                                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                                            }}>
                                            <div style={{
                                                position: 'absolute', top: '3px',
                                                left: notifications[item.key] ? '23px' : '3px',
                                                width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                            }} />
                                        </div>
                                    </div>
                                ))}
                                <button className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
                                    Save Preferences
                                </button>
                            </SettingsSection>
                        )}

                        {/* ── DANGER ZONE ── */}
                        {activeTab === 'danger' && (
                            <SettingsSection icon="⚠️" title="Danger Zone" subtitle="Irreversible actions. Please proceed with extreme caution.">
                                <div style={{ border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem', background: 'rgba(239,68,68,0.04)' }}>
                                    <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent-error)' }}>🗑️ Deactivate Account</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
                                        Deactivating will immediately revoke your access. Your data will be retained for 30 days before permanent deletion.
                                    </p>
                                    <div className="input-group">
                                        <label className="input-label">Type your username to confirm: <strong>{user?.username}</strong></label>
                                        <input type="text" className="form-input" placeholder={user?.username}
                                            value={deactivateConfirm}
                                            onChange={e => setDeactivateConfirm(e.target.value)}
                                            style={{ borderColor: deactivateConfirm === user?.username ? 'var(--accent-error)' : '' }} />
                                    </div>
                                    <button className="btn btn-primary"
                                        disabled={deactivateConfirm !== user?.username}
                                        style={{ background: 'var(--accent-error)', opacity: deactivateConfirm === user?.username ? 1 : 0.4 }}>
                                        Permanently Deactivate Account
                                    </button>
                                </div>
                                {user?.role === 'admin' && (
                                    <div style={{ border: '1px solid rgba(239,68,68,0.5)', borderRadius: '12px', padding: '1.5rem', background: 'rgba(239,68,68,0.06)' }}>
                                        <h4 style={{ margin: '0 0 0.5rem', color: 'var(--accent-error)' }}>💥 Delete Entire Workspace</h4>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
                                            This will permanently delete <strong>{user?.tenant?.name}</strong>, all its users, documents, and invoices. This cannot be undone.
                                        </p>
                                        <button className="btn btn-primary" style={{ background: 'var(--accent-error)' }} disabled>
                                            Contact Support to Delete Workspace
                                        </button>
                                    </div>
                                )}
                            </SettingsSection>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Settings;
