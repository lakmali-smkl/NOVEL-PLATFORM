import React, { useState, useEffect } from 'react'; // Added useState and useEffect
import { Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './WriterDashboard.css';
import ManageWorks from '../components/ManageWorks';
import WriterWelcome from './WriterWelcome';

const WriterDashboard = ({ user, setUser }) => { // Added setUser prop to update app-wide state
  const navigate = useNavigate();
  
  // 1. Local state to control the modal visibility
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // 2. Logic: If writer and hasn't seen welcome, show it
    if (user?.isWriter && user?.hasSeenWelcome === false) {
      setShowWelcome(true);
    }
  }, [user]);

  // 3. Function to close modal and update database
  const handleCloseWelcome = async () => {
    setShowWelcome(false);
    try {
      await axios.put(`http://localhost:5000/api/users/update-welcome/${user._id}`);
      
      // Update local state so it doesn't pop up again
      const updatedUser = { ...user, hasSeenWelcome: true };
      setUser(updatedUser); 
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      console.error("Failed to update welcome status", err);
    }
  };

  if (!user || user.isWriter !== true) {
    return <Navigate to="/" />;
  }

  return (
    <div className="writer-container">
      {/* 4. RENDER THE MODAL HERE */}
      {showWelcome && <WriterWelcome onConfirm={handleCloseWelcome} />}

      <header className="writer-header">
        <h1>Writer Control Panel</h1>
        <p>Welcome back, {user.username}. What are we writing today?</p>
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

export default WriterDashboard;