import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = ({ isSidebarOpen, setIsSidebarOpen }) => {
  return (
    <div className="dashboard-container">
      {/* Sidebar now controlled by props */}
      <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
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