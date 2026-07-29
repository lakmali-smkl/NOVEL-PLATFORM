import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import SidebarProfile from './SidebarProfile';
import './UserSidebar.css';

import { API_BASE_URL } from '../config';
const UserSidebar = ({ user, closeSidebar }) => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const isActive = (path) => location.pathname === path ? 'active' : '';

  useEffect(() => {
    if (!user?._id) return;
    const fetchCount = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/notifications/unread/${user._id}`);
        setUnreadCount(res.data.count || 0);

        const msgRes = await axios.get(`${API_BASE_URL}/api/messages/unread-count/${user._id}`);
        setUnreadMsgCount(msgRes.data.count || 0);
      } catch (err) {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="user-sidebar-content">
      <div className="sidebar-top-header">
        <div className="user-badge">Reader Portal</div>
        <SidebarProfile user={user} />
      </div>

        <nav className="sidebar-nav">
            <ul>
                <li>
                    <Link to="/dashboard/profile" className={`nav-item ${isActive('/dashboard/profile')}`} onClick={closeSidebar}>
                    <span className="nav-icon">👤</span> Profile
                    </Link>
                </li>
                <li>
                    <Link to="/chat" className={`nav-item ${isActive('/chat')}`} onClick={closeSidebar}>
                    <span className="nav-icon">💬</span> Messages
                    {unreadMsgCount > 0 && (
                      <span className="sidebar-notif-badge" style={{ backgroundColor: 'var(--accent, #3b82f6)' }}>{unreadMsgCount > 9 ? '9+' : unreadMsgCount}</span>
                    )}
                    </Link>
                </li>
                <li>
                    <Link to="/dashboard/favorites" className={`nav-item ${isActive('/dashboard/favorites')}`} onClick={closeSidebar}>
                    <span className="nav-icon">❤️</span> Favorites
                    </Link>
                </li>
                <li>
                    <Link to="/dashboard/read-later" className={`nav-item ${isActive('/dashboard/read-later')}`} onClick={closeSidebar}>
                    <span className="nav-icon">🔖</span> Library
                    </Link>
                </li>
                <li>
                    <Link to="/dashboard/history" className={`nav-item ${isActive('/dashboard/history')}`} onClick={closeSidebar}>
                    <span className="nav-icon">🕒</span> History
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
                
                <li>
                    <Link to="/dashboard/settings" className={`nav-item ${isActive('/dashboard/settings')}`} onClick={closeSidebar}>
                    <span className="nav-icon">⚙️</span> Settings
                    </Link>
                </li>

                <li>
                    <Link to="/dashboard/request-writer" className={`nav-item ${isActive('/dashboard/request-writer')}`} onClick={closeSidebar}>
                        <span className="nav-icon">✍️</span> Become a Writer
                    </Link>
                </li>
            </ul>
        </nav>
    </div>
  );
};

export default UserSidebar;