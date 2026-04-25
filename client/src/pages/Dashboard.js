import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
        <aside className="sidebar">
            <h2>My Dashboard</h2>
            <ul>
                <li>Profile</li>
                <li>My Novels</li>
                <li>Favorites</li>
                <li>Settings</li>
            </ul>
        </aside>
      
      <main className="content">
            <h1>Welcome Back!</h1>
                <div className="grid-container">
                    <div className="card">
                        <h3>My Favorites</h3>
                        <p>You have 3 novels saved.</p>
                    </div>
                    <div className="card">
                        <h3>Recent Novels</h3>
                        <p>Continue reading: "The Midnight Forest"</p>
                    </div>
            </div>
        </main>
    </div>
  );
};

export default Dashboard;