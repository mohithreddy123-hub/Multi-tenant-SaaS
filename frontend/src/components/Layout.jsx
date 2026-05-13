import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import {
  LayoutDashboard, FileText, Users, PenTool,
  CreditCard, Settings, LogOut, Menu, X,
  Shield, ChevronLeft, ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/team', label: 'Team', icon: Users },
  { path: '/editor/0', label: 'Editor', icon: PenTool },
  { path: '/billing', label: 'Billing', icon: CreditCard },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/editor/0') return location.pathname.startsWith('/editor');
    return location.pathname === path;
  };

  return (
    <div className="tv-layout">
      {/* Mobile overlay */}
      {mobileOpen && <div className="tv-sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Mobile menu button */}
      <button className="tv-mobile-btn" onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`tv-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="tv-sidebar-logo">
          <div className="tv-logo-icon">
            <Shield size={20} />
          </div>
          {!collapsed && <span className="tv-logo-text">TenantVault</span>}
        </div>

        {/* Nav */}
        <nav className="tv-sidebar-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`tv-nav-item ${active ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
                {active && <div className="tv-nav-indicator" />}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <button className="tv-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* User section */}
        <div className="tv-sidebar-user">
          <div className="tv-user-avatar">
            {user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          {!collapsed && (
            <div className="tv-user-info">
              <span className="tv-user-name">{user?.username}</span>
              <span className="tv-user-role">{user?.role}</span>
            </div>
          )}
          <button className="tv-logout-btn" onClick={() => setShowLogoutModal(true)} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="tv-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="tv-modal" style={{ maxWidth: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '50%', 
              background: 'rgba(239,68,68,0.1)', color: 'var(--error)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <LogOut size={24} />
            </div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Confirm Logout</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
              Are you sure you want to end your current session? You will need to log in again to access your workspace.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="tv-btn tv-btn-secondary tv-btn-block" onClick={() => setShowLogoutModal(false)}>
                Cancel
              </button>
              <button className="tv-btn tv-btn-danger tv-btn-block" onClick={confirmLogout}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="tv-main">
        {children}
      </main>
    </div>
  );
};

export default Layout;
