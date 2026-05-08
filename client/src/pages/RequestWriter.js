import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RequestWriter.css';

const RequestWriter = ({ user }) => {
  const [requestStatus, setRequestStatus] = useState('none');
  const [reason, setReason] = useState('');

  // Initialize and sync status when user object loads
  useEffect(() => {
    if (user?.writerRequestStatus) {
      // Always trust the database value over localStorage
      if (user.writerRequestStatus !== 'none') {
        setRequestStatus(user.writerRequestStatus);
      } else {
        setRequestStatus('none');
        localStorage.removeItem('writerRequestStatus');
      }
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
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Failed to send request. Please try again.");
    }
  };

  return (
    <div className="request-container">
      <div className="request-card">
        {requestStatus === 'none' && (
          <>
            <div className="request-header">
              <span className="writer-tag">JOIN THE TEAM</span>
              <h2>Become a Writer</h2>
              <p>Apply to get publishing rights and manage your own novels.</p>
            </div>
            <form onSubmit={handleSubmit} className="request-form">
              <textarea 
                placeholder="Tell us why you want to become a writer..." 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required 
              />
              <button type="submit" className="request-btn">Submit Application</button>
            </form>
          </>
        )}

        {requestStatus === 'pending' && (
          <div className="status-display pending">
            <div className="pulse-icon">⏳</div>
            <h3>Application Pending</h3>
            <p>Your request is being reviewed by our Admin team. You will be notified once you are granted Writer access.</p>
          </div>
        )}

        {requestStatus === 'rejected' && (
          <div className="status-display rejected">
            <div className="error-icon">❌</div>
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