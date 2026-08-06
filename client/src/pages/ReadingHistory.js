import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ReadingHistory.css';

import { API_BASE_URL } from '../config';
const ReadingHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Authentication fallback
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user?._id || user?.id;

  // 📥 FETCH HISTORY ON LOAD
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    fetch(`${API_BASE_URL}/api/users/${userId}/history`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching history:", err);
        setLoading(false);
      });
  }, [userId]);

  // ✂️ REMOVE SINGLE ITEM
  const handleRemove = async (contentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}/history/${contentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setHistory(prev => prev.filter(item => item.contentId !== contentId));
      }
    } catch (err) {
      console.error("Error removing item:", err);
    }
  };

  // 🗑️ CLEAR ALL
  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear your entire reading history?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}/history`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setHistory([]);
      }
    } catch (err) {
      console.error("Error clearing history:", err);
    }
  };

  // 🕒 Relative Time Formatter
  const timeAgo = (dateString) => {
    const s = Math.floor((Date.now() - new Date(dateString)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="history-container">
        <p className="history-loading">Loading your history...</p>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <div className="history-title-wrap">
          <h1>Reading History</h1>
          <p>Pick up exactly where you left off.</p>
        </div>
        {history.length > 0 && (
          <button className="clear-all-btn" onClick={handleClearAll}>
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="history-empty-state">
          <div className="empty-icon">📖</div>
          <p>Your reading history is empty.</p>
          <Link to="/dashboard/favorites" className="browse-btn">Browse Library</Link>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item, index) => (
            <div 
              key={item.contentId} 
              className="history-item-row"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {/* Cover Image */}
              <div className="history-cover-wrap">
                {item.coverPhoto ? (
                  <img 
                    src={`${API_BASE_URL}/${item.coverPhoto}`} 
                    alt={item.title} 
                    className="history-cover"
                  />
                ) : (
                  <div className="history-cover-placeholder">📚</div>
                )}
                <span className={`history-type-badge ${item.type === 'article' ? 'article-badge' : 'novel-badge'}`}>
                  {item.type}
                </span>
              </div>

              {/* Info */}
              <div className="history-info">
                <h3>{item.title}</h3>
                <p className="history-time">Last read: {timeAgo(item.lastRead)}</p>
              </div>

              {/* Actions */}
              <div className="history-actions">
                <Link to={`/read/${item.type}/${item.contentId}`} className="history-resume-btn">
                  Continue Reading &rarr;
                </Link>
                <button 
                  className="history-remove-btn" 
                  onClick={() => handleRemove(item.contentId)}
                  title="Remove from history"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReadingHistory;