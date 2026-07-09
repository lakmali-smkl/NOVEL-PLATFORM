import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import SidebarProfile from './SidebarProfile';
import './AdminSidebar.css';

const AdminSidebar = ({ user, closeSidebar }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/admin/dashboard',      label: 'Dashboard',        icon: '📊' },
    { path: '/admin/writer-requests', label: 'Writer Requests', icon: '🔔' },
    { path: '/admin/manage-users',   label: 'User Directory',   icon: '👥' },
    { path: '/admin/global-content', label: 'Content Oversight', icon: '📚' },
    { path: '/admin/analytics',      label: 'Site Growth',      icon: '📈' },
  ];

  return (
    <div className="admin-sidebar">
      {/* ── Pinned header with profile card ── */}
      <div className="admin-sidebar-header">
        <div className="admin-badge">ADMIN</div>
        <h4>Control Panel</h4>
        {user && <SidebarProfile user={user} />}
      </div>

      {/* ── Scrollable nav ── */}
      <nav className="admin-sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`admin-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            <span className="admin-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default AdminSidebar;