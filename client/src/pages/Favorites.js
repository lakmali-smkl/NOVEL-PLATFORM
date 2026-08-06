import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Favorites.css';

import { API_BASE_URL } from '../config';
const Favorites = () => {
  const [favs, setFavs] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'novel', 'article'
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    if (user && user.email) {
      fetch(`${API_BASE_URL}/api/users/${user.email}`)
        .then(res => res.json())
        .then(data => setFavs(data.favorites || []))
        .catch(err => console.error("Error fetching favorites:", err));
    }
  }, [user]);

  if (!user) {
    return (
      <div className="fav-content">
        <div className="fav-empty-state">
          <h2>Please login to see your favorites.</h2>
        </div>
      </div>
    );
  }

  const handleDelete = async (contentId) => {
    if (window.confirm("Remove from favorites?")) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/${user._id}/favorites/${contentId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
          setFavs(prevFavs => prevFavs.filter(item => item.contentId !== contentId));
        } else {
          const errorData = await response.json();
          console.error("Server error:", errorData.message);
        }
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const filteredFavs = favs.filter(item => {
    if (activeTab === 'all') return true;
    return item.type === activeTab;
  });

  const countByType = (type) => {
    if (type === 'all') return favs.length;
    return favs.filter(item => item.type === type).length;
  };

  return (
    <div className="fav-content">
      <div className="fav-header-section">
        <h2>My Saved Favorites</h2>
        <p className="fav-subtitle">Access your favorite novels and articles in one place.</p>
      </div>

      {/* Premium Tab Switcher */}
      <div className="fav-tabs-container">
        <button 
          className={`fav-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📚 All <span className="tab-count">{countByType('all')}</span>
        </button>
        <button 
          className={`fav-tab ${activeTab === 'novel' ? 'active' : ''}`}
          onClick={() => setActiveTab('novel')}
        >
          📖 Novels <span className="tab-count">{countByType('novel')}</span>
        </button>
        <button 
          className={`fav-tab ${activeTab === 'article' ? 'active' : ''}`}
          onClick={() => setActiveTab('article')}
        >
          📝 Articles <span className="tab-count">{countByType('article')}</span>
        </button>
      </div>

      <div className="fav-list">
        {filteredFavs.length > 0 ? (
          filteredFavs.map(item => (
            <div key={item.contentId} className="fav-card">
              <div className="fav-card-type-tag">
                {item.type === 'novel' ? '📖 Novel' : '📝 Article'}
              </div>
              <h3>{item.title}</h3>
              <div className="fav-actions">
                <Link to={`/read/${item.type}/${item.contentId}`} className="read-btn">
                  Read Now
                </Link>
                <button 
                  className="delete-btn" 
                  onClick={() => handleDelete(item.contentId)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="fav-empty-state">
            <span className="empty-icon">⭐</span>
            <p>No favorites found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;