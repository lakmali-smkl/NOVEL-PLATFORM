import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import SidebarProfile from './SidebarProfile';
import './AdminSidebar.css';

import { API_BASE_URL } from '../config';
const AdminSidebar = ({ user, closeSidebar }) => {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/writer-requests`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const pending = Array.isArray(res.data)
          ? res.data.filter((r) => r.status === 'pending').length
          : 0;
        setPendingCount(pending);
      } catch (err) {
        console.error('Error fetching pending writer requests', err);
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    const fetchUnreadCounts = async () => {
      try {
        const authHeaders = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
        const [msgRes, notifRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/messages/unread-count/${user._id}`, authHeaders),
          axios.get(`${API_BASE_URL}/api/notifications/unread/${user._id}`, authHeaders)
        ]);
        setUnreadMsgCount(msgRes.data.count || 0);
        setUnreadNotifCount(notifRes.data.count || 0);
      } catch (err) {
        console.error('Error fetching unread counts', err);
      }
    };

    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const menuItems = [
    { path: '/admin/dashboard',      label: 'Dashboard',        icon: '📊' },
    { path: '/admin/writer-requests', label: 'Writer Requests', icon: '🔔', badge: pendingCount },
    { path: '/admin/manage-users',   label: 'User Directory',   icon: '👥' },
    { path: '/admin/global-content', label: 'Content Oversight', icon: '📚' },
    { path: '/admin/announcements',  label: 'Announcements',    icon: '📢' },
    { path: '/admin/analytics',      label: 'Site Growth',      icon: '📈' },
    { path: '/chat',                 label: 'Messages',         icon: '💬', badge: unreadMsgCount },
    { path: '/notifications',        label: 'Notifications',    icon: '🔔', badge: unreadNotifCount },
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
            <span className="admin-nav-label">{item.label}</span>
            {!!item.badge && <span className="admin-nav-badge">{item.badge}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default AdminSidebar;