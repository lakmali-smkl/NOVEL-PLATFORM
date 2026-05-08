import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './UserSidebar.css';

const UserSidebar = ({ user, closeSidebar }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="user-sidebar-content">
      <div className="sidebar-header">
        <div className="user-badge">Personal</div>
        <h3>Explorer</h3>
        <p>{user?.username || "Reader"}</p>
      </div>

        <nav className="sidebar-nav">
            <ul>
                <li>
                    <Link to="/dashboard/profile" className={`nav-item ${isActive('/dashboard/profile')}`} onClick={closeSidebar}>
                    <span className="nav-icon">👤</span> Profile
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