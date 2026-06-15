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
      const res = await axios.get('http://localhost:5000/api/admin/writer-requests');
      setRequests(res.data);
    };
    fetchRequests();
  }, []);

  const approveWriter = async (userId, requestId, action) => {
    try {
      // 1. Approve or reject writer request in backend
      const response = await axios.post(`http://localhost:5000/api/admin/approve-writer/${userId}`, {
        action: action
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
        <h2>Previous Requests</h2>
        {handledRequests.length === 0 ? (
          <p className="empty-notice">No approved or rejected requests yet.</p>
        ) : (
          handledRequests.map((req) => (
            <div key={req._id} className="request-list-item">
              <div className="request-header">
                <p><strong>User:</strong> {req.username}</p>
                <span className={`status-badge status-${req.status}`}>{req.status}</span>
              </div>
              <p><strong>Reason:</strong> {req.reason}</p>
              <p><strong>Processed at:</strong> {new Date(req.createdAt).toLocaleString()}</p>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default WriterRequests;