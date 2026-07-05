import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ManageWorks from '../components/ManageWorks';
import WriterWelcome from './WriterWelcome';

const WriterDashboardMain = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (user?.isWriter && user?.hasSeenWelcome === false) {
      setShowWelcome(true);
    }
  }, [user]);

  const handleCloseWelcome = async () => {
    setShowWelcome(false);
    try {
      await axios.put(`http://localhost:5000/api/users/update-welcome/${user._id || user.id}`);
      const updatedUser = { ...user, hasSeenWelcome: true };
      if (setUser) setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      console.error("Failed to update welcome status", err);
    }
  };

  return (
    <div className="writer-dashboard-main-content">
      {showWelcome && <WriterWelcome onConfirm={handleCloseWelcome} />}

      <header className="writer-header">
        <h1>Writer Control Panel</h1>
        <p>Welcome back, {user?.username}. What are we writing today?</p>
      </header>

      <div className="writer-actions">
        <div className="action-card">
          <h3>Write Novels</h3>
          <p>Create, edit, or delete your stories.</p>
          <button className="writer-btn" onClick={() => navigate('/add-novel')}>
            Add New Novel
          </button>
        </div>

        <div className="action-card">
          <h3>Write Article</h3>
          <p>Share updates or thoughts with your readers.</p>
          <button className="writer-btn" onClick={() => navigate('/add-article')}>
            Write New Article
          </button>
        </div>

        <div className="full-width-section">
          <ManageWorks user={user} />
        </div>        
      </div>
    </div>
  );
};

export default WriterDashboardMain;
