import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-container">
      
      {/* 1. Hamburger Button (Only shows when menu is CLOSED) */}
      {!isSidebarOpen && (
        <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
          ☰
        </button>
      )}

      {/* 2. Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
        {/* Close Button (Only shows when menu is OPEN, inside the sidebar) */}
        <button className="close-btn" onClick={() => setIsSidebarOpen(false)}>
          ✕
        </button>
        
        <h2>My Dashboard</h2>
        <ul>
          <li><Link to="/dashboard/favorites" onClick={() => setIsSidebarOpen(false)}>Favorites</Link></li>
          <li><Link to="/dashboard/profile" onClick={() => setIsSidebarOpen(false)}>Profile</Link></li>
        </ul>
      </aside>
      
      <main className="content">
        <Outlet /> 
      </main>
    </div>
  );
};

export default Dashboard;