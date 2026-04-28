import React from 'react';
import { Navigate } from 'react-router-dom';
import './AdminDashboard.css'; // We will create this next
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();

  if (user) {
    console.log("Is user admin?", user.isAdmin);
    console.log("Type of isAdmin:", typeof user.isAdmin);
  }

  if (!user || user.isAdmin !== true) {
    console.log("Redirecting to Home...");
    return <Navigate to="/" />;
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Admin Control Panel</h1>
        <p>Welcome back, {user.username}. What are we writing today?</p>
      </header>

      <div className="admin-actions">
        {/* Manage Novels Card */}
        <div className="action-card">
          <h3>Manage Novels</h3>
          <p>Create, edit, or delete your stories.</p>
          <button className="admin-btn" onClick={() => navigate('/add-novel')}>
            Add New Novel
          </button>
        </div>

        <div className="action-card">
          <h3>Write Article</h3>
          <p>Share updates or thoughts with your readers.</p>
          <button className="admin-btn" onClick={() => navigate('/add-article')}>
            Write New Article
          </button>
        </div>

        {/* View Library Card */}
        <div className="action-card">
          <h3>Library</h3>
          <p>View all published novels on your platform.</p>
          <Link to="/library">
            <button className="admin-btn">View Library</button>
          </Link>
        </div>

        {/* Stats Card */}
        <div className="action-card">
          <h3>Site Stats</h3>
          <p>Analyze traffic and see how many people are reading your work.</p>
          <button className="admin-btn secondary">View Analytics</button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;