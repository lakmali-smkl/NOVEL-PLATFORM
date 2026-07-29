import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RequestWriter.css';

const RequestWriter = ({ user, setUser }) => {
  const [requestStatus, setRequestStatus] = useState('none');
  const [reason, setReason] = useState('');

  // Initialize and sync status when user object loads
  useEffect(() => {
    if (user?.writerRequestStatus && user.writerRequestStatus !== 'none') {
      setRequestStatus(user.writerRequestStatus);
      return;
    }

    const storedStatus = localStorage.getItem('writerRequestStatus');
    if (storedStatus) {
      setRequestStatus(storedStatus);
    } else {
      setRequestStatus('none');
    }
  }, [user?.writerRequestStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || !user._id) {
      alert('Please log in before submitting a writer request.');
      return;
    }

    try {
      // 1. Send request to backend
      await axios.post('http://localhost:5000/api/writer-requests', {
        userId: user._id,
        username: user.username,
        reason: reason
      });

      // 2. Update local UI state
      localStorage.setItem('writerRequestStatus', 'pending');
      setRequestStatus('pending');

      if (setUser && user) {
        const updatedUser = { ...user, writerRequestStatus: 'pending' };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Failed to send request. Please try again.");
    }
  };

  return (
    <div className="request-container">
      <div className="request-bg-glow request-bg-glow-1"></div>
      <div className="request-bg-glow request-bg-glow-2"></div>

      <div className="request-card">
        {requestStatus === 'none' && (
          <>
            <div className="request-header">
              <div className="request-icon-badge">✍️</div>
              <span className="writer-tag">JOIN THE TEAM</span>
              <h2>Become a Writer</h2>
              <p>Apply to get publishing rights and manage your own novels.</p>
            </div>

            <ul className="writer-perks-list">
              <li><span className="perk-icon">📚</span> Publish unlimited novels &amp; articles</li>
              <li><span className="perk-icon">📊</span> Track live readership &amp; engagement metrics</li>
              <li><span className="perk-icon">💬</span> Chat directly with your readers</li>
            </ul>

            <form onSubmit={handleSubmit} className="request-form">
              <div className="input-group">
                <label htmlFor="writer-reason">Why do you want to become a writer?</label>
                <textarea
                  id="writer-reason"
                  placeholder="Tell us why you want to become a writer..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="request-btn">Submit Application</button>
            </form>
          </>
        )}

        {requestStatus === 'pending' && (
          <div className="status-display pending">
            <div className="status-icon-badge pulse-icon">⏳</div>
            <h3>Application Pending</h3>
            <p>Your request is being reviewed by our Admin team. You will be notified once you are granted Writer access.</p>
          </div>
        )}

        {requestStatus === 'rejected' && (
          <div className="status-display rejected">
            <div className="status-icon-badge error-icon">❌</div>
            <h3>Application Rejected</h3>
            <p>Your writer application was not approved. You can submit a new application below.</p>
            <button
              onClick={() => {
                setRequestStatus('none');
                setReason('');
              }}
              className="retry-btn"
            >
              Submit New Application
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestWriter;