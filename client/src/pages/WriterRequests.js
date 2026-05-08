import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './WriterRequests.css';

const WriterRequests = () => {
  const [requests, setRequests] = useState([]);

  // Load all pending applications
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
        // 2. Remove the request from the list visually
        setRequests(requests.filter(req => req._id !== requestId));
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
      {requests.map((req) => (
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
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WriterRequests;