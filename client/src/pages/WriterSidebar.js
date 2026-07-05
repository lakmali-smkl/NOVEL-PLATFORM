import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './WriterSidebar.css';

const WriterSidebar = ({ user, closeSidebar }) => {
  const location = useLocation();
  
  if (!user || !user.isWriter) return null;

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="writer-sidebar-content">
      <div className="sidebar-header" style={{ marginBottom: '20px' }}>
        <div className="user-badge" style={{ background: 'linear-gradient(135deg, #770307 0%, #2a0103 100%)' }}>
          Writer Portal
        </div>
        <h3>Workspace</h3>
        <p>{user.username}</p>
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
          
          <div className="sidebar-divider"></div>

          <div className="sidebar-header"><h3>Library</h3></div>
          <li>
            <Link to="/writer-dashboard/favorites" className={`nav-item ${isActive('/writer-dashboard/favorites')}`} onClick={closeSidebar}>
              <span className="nav-icon">❤️</span> My Favorites
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