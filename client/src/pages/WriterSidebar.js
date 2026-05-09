import React from 'react';
import { Link } from 'react-router-dom';
import './WriterSidebar.css';

const WriterSidebar = ({ user, closeSidebar }) => {
  if (!user || !user.isWriter) return null;

  return (
    <div className="writer-sidebar-content">
      <div className="sidebar-header" style={{ marginBottom: '20px' }}>
        <h2>WRITER PORTAL</h2>
        <p>{user.username}</p>
      </div>
      <ul>
        <div className="sidebar-header"><h3>Workspace</h3></div>
        <li><Link to="/writer-dashboard" onClick={closeSidebar}>📊 Dashboard</Link></li>
        <li><Link to="/add-article" onClick={closeSidebar}>📝 Create Article</Link></li>
        <li><Link to="/add-novel" onClick={closeSidebar}>📖 Create Novel</Link></li>
        
        <div className="sidebar-divider"></div>

        <div className="sidebar-header"><h3>Library</h3></div>
        <li>
          <Link to="/dashboard/favorites" onClick={closeSidebar}>❤️ My Favorites</Link>
        </li>

        <div className="sidebar-divider"></div>
        
        <div className="sidebar-header"><h3>Management</h3></div>
        <li><Link to="/dashboard/my-novels" onClick={closeSidebar}>📁 My Publications</Link></li>
        <li><Link to="/dashboard/profile" onClick={closeSidebar}>👤 Profile Settings</Link></li>
      </ul>
    </div>
  );
};

export default WriterSidebar;