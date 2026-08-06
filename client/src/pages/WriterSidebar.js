import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import SidebarProfile from './SidebarProfile';
import './WriterSidebar.css';

import { API_BASE_URL } from '../config';
const WriterSidebar = ({ user, closeSidebar }) => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  // Fetch unread count on mount — must be before any early return
  useEffect(() => {
    if (!user?._id) return;
    const fetchCount = async () => {
      try {
        const authHeaders = { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } };
        const res = await axios.get(`${API_BASE_URL}/api/notifications/unread/${user._id}`, authHeaders);
        setUnreadCount(res.data.count || 0);

        const msgRes = await axios.get(`${API_BASE_URL}/api/messages/unread-count/${user._id}`, authHeaders);
        setUnreadMsgCount(msgRes.data.count || 0);
      } catch (err) {
        // silently fail
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user || !user.isWriter) return null;

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="writer-sidebar-content">
      <div className="sidebar-top-header">
        <div className="user-badge" style={{ background: 'linear-gradient(135deg, #770307 0%, #2a0103 100%)' }}>
          Writer Portal
        </div>
        <SidebarProfile user={user} />
      </div>

      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/writer-dashboard" className={`nav-item ${isActive('/writer-dashboard')}`} onClick={closeSidebar}>
              <span className="nav-icon">📊</span> Dashboard
            </Link>
          </li>
          <li>
            <Link to="/add-novel" className={`nav-item ${isActive('/add-novel')}`} onClick={closeSidebar}>
              <span className="nav-icon">📖</span> Create Novel
            </Link>
          </li>
          <li>
            <Link to="/add-article" className={`nav-item ${isActive('/add-article')}`} onClick={closeSidebar}>
              <span className="nav-icon">📝</span> Create Article
            </Link>
          </li>
          <li>
            <Link to="/writer-dashboard/works" className={`nav-item ${isActive('/writer-dashboard/works')}`} onClick={closeSidebar}>
              <span className="nav-icon">🗂️</span> My Works
            </Link>
          </li>

          <div className="sidebar-divider"></div>

          <div className="sidebar-header"><h3>Library</h3></div>
          <li>
            <Link to="/writer-dashboard/favorites" className={`nav-item ${isActive('/writer-dashboard/favorites')}`} onClick={closeSidebar}>
              <span className="nav-icon">❤️</span> My Favorites
            </Link>
          </li>

          <div className="sidebar-divider"></div>

          <div className="sidebar-header"><h3>Community</h3></div>
          <li>
            <Link to="/chat" className={`nav-item ${isActive('/chat')}`} onClick={closeSidebar}>
              <span className="nav-icon">💬</span> Messages
              {unreadMsgCount > 0 && (
                <span className="sidebar-notif-badge" style={{ backgroundColor: 'var(--accent, #3b82f6)' }}>{unreadMsgCount > 9 ? '9+' : unreadMsgCount}</span>
              )}
            </Link>
          </li>
          <li>
            <Link to="/notifications" className={`nav-item ${isActive('/notifications')}`} onClick={closeSidebar}>
              <span className="nav-icon">🔔</span> Notifications
              {unreadCount > 0 && (
                <span className="sidebar-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </Link>
          </li>

          <div className="sidebar-divider"></div>

          <div className="sidebar-header"><h3>Management</h3></div>
          <li>
            <Link to="/writer-dashboard/profile" className={`nav-item ${isActive('/writer-dashboard/profile')}`} onClick={closeSidebar}>
              <span className="nav-icon">👤</span> Profile
            </Link>
          </li>
          <li>
            <Link to="/writer-dashboard/settings" className={`nav-item ${isActive('/writer-dashboard/settings')}`} onClick={closeSidebar}>
              <span className="nav-icon">⚙️</span> Settings
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default WriterSidebar;