import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './WriterRequests.css';

import { API_BASE_URL } from '../config';
const WriterRequests = () => {
  const [requests, setRequests] = useState([]);

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const handledRequests = requests.filter(req => req.status !== 'pending');

  // Load all writer application records
  useEffect(() => {
    const fetchRequests = async () => {
      const res = await axios.get(`${API_BASE_URL}/api/admin/writer-requests`, {
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
      const response = await axios.post(`${API_BASE_URL}/api/admin/approve-writer/${userId}`, {
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
      await axios.delete(`${API_BASE_URL}/api/admin/writer-requests/${requestId}`, {
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
    <div className="wreq-page">
      <div className="wreq-page-header">
        <h1>Writer Applications</h1>
        <p className="wreq-page-subtitle">Review and manage requests from readers who want publishing rights.</p>
      </div>

      <section className="wreq-section">
        <div className="wreq-section-title-row">
          <h2>Pending Requests</h2>
          {pendingRequests.length > 0 && (
            <span className="wreq-count wreq-count-pending">{pendingRequests.length}</span>
          )}
        </div>

        {pendingRequests.length === 0 ? (
          <div className="wreq-empty">
            <span className="wreq-empty-icon">✅</span>
            <p>No pending requests at this time.</p>
          </div>
        ) : (
          pendingRequests.map((req) => (
            <div key={req._id} className="wreq-item">
              <div className="wreq-item-top">
                <div className="wreq-item-identity">
                  <div className="wreq-avatar">{req.username.charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="wreq-item-name">{req.username}</p>
                    <span className="wreq-status-pill wreq-status-pending">Awaiting Review</span>
                  </div>
                </div>
              </div>

              <p className="wreq-item-reason">“{req.reason}”</p>

              <div className="wreq-actions">
                <button
                  onClick={() => approveWriter(req.userId, req._id, 'approve')}
                  className="wreq-approve-btn"
                >
                  <span>✓</span> Approve
                </button>
                <button
                  onClick={() => approveWriter(req.userId, req._id, 'reject')}
                  className="wreq-reject-btn"
                >
                  <span>✕</span> Reject
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="wreq-section">
        <div className="wreq-section-title-row">
          <h2>Previous Requests</h2>
          {handledRequests.length > 0 && (
            <span className="wreq-count">{handledRequests.length}</span>
          )}
        </div>

        {handledRequests.length === 0 ? (
          <div className="wreq-empty">
            <span className="wreq-empty-icon">🗂️</span>
            <p>No approved or rejected requests yet.</p>
          </div>
        ) : (
          <ul className="wreq-feed">
            {handledRequests.map((req) => (
              <li key={req._id} className={`wreq-history-item wreq-history-${req.status}`}>
                <div className="wreq-avatar">{req.username.charAt(0).toUpperCase()}</div>
                <div className="wreq-history-body">
                  <p className="wreq-history-text">
                    <span className="wreq-username">{req.username}</span>
                    {' '}applied to become a writer
                  </p>
                  <p className="wreq-reason">{req.reason}</p>
                  <span className="wreq-time">{timeAgo(req.createdAt)}</span>
                </div>
                <div className="wreq-history-right">
                  <span className={`wreq-status-pill wreq-status-${req.status}`}>
                    {req.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                  </span>
                  <button
                    className="wreq-delete-btn"
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
