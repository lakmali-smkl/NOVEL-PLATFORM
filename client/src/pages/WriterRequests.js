import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './WriterRequests.css';

const WriterRequests = () => {
  const [requests, setRequests] = useState([]);

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const handledRequests = requests.filter(req => req.status !== 'pending');

  // Load all writer application records
  useEffect(() => {
    const fetchRequests = async () => {
      const res = await axios.get('http://localhost:5000/api/admin/writer-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setRequests(res.data);
    };
    fetchRequests();
  }, []);

  const approveWriter = async (userId, requestId, action) => {
    try {
      const response = await axios.post(`http://localhost:5000/api/admin/approve-writer/${userId}`, {
        action: action
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.status === 200) {
        setRequests((prevRequests) => prevRequests.map((req) =>
          req._id === requestId ? { ...req, status: action === 'approve' ? 'approved' : 'rejected' } : req
        ));
        alert(`Writer ${action}ed successfully!`);
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      alert(`Failed to ${action} writer request. Please try again.`);
    }
  };

  const deleteRequest = async (requestId) => {
    if (!window.confirm('Remove this record from history?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/writer-requests/${requestId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setRequests(prev => prev.filter(r => r._id !== requestId));
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to remove record. Please try again.');
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="admin-requests-page">
      <h1>Writer Applications</h1>

      <section className="writer-section">
        <h2>Pending Requests ({pendingRequests.length})</h2>
        {pendingRequests.length === 0 ? (
          <p className="empty-notice">No pending requests at this time.</p>
        ) : (
          pendingRequests.map((req) => (
            <div key={req._id} className="request-list-item">
              <p><strong>User:</strong> {req.username}</p>
              <p><strong>Reason:</strong> {req.reason}</p>
              <div className="request-actions">
                <button 
                  onClick={() => approveWriter(req.userId, req._id, 'approve')}
                  className="approve-btn"
                >
                  Approve
                </button>
                <button 
                  onClick={() => approveWriter(req.userId, req._id, 'reject')}
                  className="reject-btn"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="writer-section previous-requests">
        <div className="notif-section-header">
          <h2>Previous Requests</h2>
          <span className="notif-count">{handledRequests.length}</span>
        </div>
        {handledRequests.length === 0 ? (
          <p className="empty-notice">No approved or rejected requests yet.</p>
        ) : (
          <ul className="notif-feed">
            {handledRequests.map((req) => (
              <li key={req._id} className={`notif-item notif-${req.status}`}>
                <div className="notif-avatar">{req.username.charAt(0).toUpperCase()}</div>
                <div className="notif-body">
                  <p className="notif-text">
                    <span className="notif-username">{req.username}</span>
                    {' '}applied to become a writer
                  </p>
                  <p className="notif-reason">{req.reason}</p>
                  <span className="notif-time">{timeAgo(req.createdAt)}</span>
                </div>
                <div className="notif-right">
                  <span className={`notif-badge notif-badge-${req.status}`}>
                    {req.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                  </span>
                  <button
                    className="notif-delete-btn"
                    onClick={() => deleteRequest(req._id)}
                    title="Remove from history"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75V4H3a.75.75 0 0 0 0 1.5h.082l.835 12.045A2.75 2.75 0 0 0 6.66 20h6.68a2.75 2.75 0 0 0 2.743-2.455l.835-12.045H17a.75.75 0 0 0 0-1.5h-3V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM8 4h4v-.25A1.25 1.25 0 0 0 10.75 2.5h-1.5A1.25 1.25 0 0 0 8 3.75V4Zm.821 3.25a.75.75 0 0 1 .78.718l.25 8a.75.75 0 0 1-1.497.046l-.25-8a.75.75 0 0 1 .717-.784ZM12 7.25a.75.75 0 0 1 .708.783l-.25 8a.75.75 0 1 1-1.498-.046l.25-8a.75.75 0 0 1 .84-.737Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default WriterRequests;