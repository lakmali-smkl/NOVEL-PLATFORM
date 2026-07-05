import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Profile.css';

const API = 'http://localhost:5000';

const Profile = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [stats, setStats] = useState({ favoritesCount: 0, historyCount: 0, collectionsCount: 0 });

  const userId = user?._id || user?.id;

  useEffect(() => {
    if (!userId) return;

    // Sync user details
    const localUser = JSON.parse(localStorage.getItem('user'));
    if (localUser) setUser(localUser);

    // Favorites
    if (localUser?.favorites) {
      setStats(prev => ({ ...prev, favoritesCount: localUser.favorites.length }));
    }

    // Collections
    fetch(`${API}/api/collections/${userId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStats(prev => ({ ...prev, collectionsCount: data.length }));
        }
      })
      .catch(() => {});

    // History
    fetch(`${API}/api/users/${userId}/history`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStats(prev => ({ ...prev, historyCount: data.length }));
        }
      })
      .catch(() => {});
  }, [userId]);

  if (!user) {
    return (
      <div className="profile-container empty-profile">
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Member';

  const renderAvatar = () => {
    if (user.profilePicture) {
      return (
        <img 
          src={`${API}/${user.profilePicture}`} 
          alt="Profile Avatar" 
          className="avatar-image" 
        />
      );
    }
    return (
      <div className="avatar-placeholder">
        {user.username.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="profile-container">
      <div className="profile-bg-glow glow-1"></div>
      <div className="profile-bg-glow glow-2"></div>

      {/* ── Welcome Header ── */}
      <header className="profile-welcome-header">
        <h1>Dashboard Overview</h1>
        <p>Manage your account settings, track reading streak, and activity progress.</p>
      </header>

      {/* ── Header details ── */}
      <div className="profile-header">
        <div className="avatar-section">
          {renderAvatar()}
          <div className="user-title-block">
            <div className="username-view-wrap">
              <h1>{user.username}</h1>
            </div>
            <p className="email-text">{user.email}</p>
          </div>
        </div>
      </div>

      {/* ── Stats Dashboard ── */}
      <div className="stats-dashboard">
        <Link to="/dashboard/favorites" className="stat-card stat-card-link">
          <div className="stat-icon">❤️</div>
          <div className="stat-info">
            <span className="stat-number">{stats.favoritesCount}</span>
            <span className="stat-label">Favorites</span>
          </div>
        </Link>
        <Link to="/dashboard/read-later" className="stat-card stat-card-link">
          <div className="stat-icon">🔖</div>
          <div className="stat-info">
            <span className="stat-number">{stats.collectionsCount}</span>
            <span className="stat-label">Collections</span>
          </div>
        </Link>
        <Link to="/dashboard/history" className="stat-card stat-card-link">
          <div className="stat-icon">🕒</div>
          <div className="stat-info">
            <span className="stat-number">{stats.historyCount}</span>
            <span className="stat-label">Read Stories</span>
          </div>
        </Link>
      </div>

      <div className="profile-two-col">

        {/* ── LEFT COLUMN: Account Details ── */}
        <div className="profile-left-col">
          <div className="info-card">
            <h3>Account Information</h3>
            
            <div className="info-row">
              <span>Role / Account Type</span>
              <p className="role-badge">{user.isAdmin ? "Administrator" : user.isWriter ? "Writer" : "Reader"}</p>
            </div>

            <div className="info-row">
              <span>Joined Date</span>
              <p>{joinDate}</p>
            </div>

            <div className="info-row">
              <span>Account Status</span>
              <p className="status-badge-active">Active</p>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Reading Activity & Goals ── */}
        <div className="profile-right-col">
          <div className="info-card">
            <h3>🔥 Reading Activity & Goals</h3>
            <div className="streak-widget">
              <div className="streak-main">
                <span className="streak-fire">⚡</span>
                <div className="streak-txt">
                  <span className="streak-num">3 Days</span>
                  <span className="streak-sub">Active Streak</span>
                </div>
              </div>
              <div className="streak-ring-box">
                <div className="progress-ring-wrap">
                  <svg className="progress-svg" viewBox="0 0 36 36">
                    <path className="progress-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="progress-bar" strokeDasharray="60, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="progress-percentage">60%</div>
                </div>
                <div className="ring-label">
                  <strong>3 of 5</strong>
                  <span>Weekly Goal</span>
                </div>
              </div>
            </div>
            
            <div className="daily-checklist">
              <div className="day-box checked"><span>M</span><span className="check-dot">✓</span></div>
              <div className="day-box checked"><span>T</span><span className="check-dot">✓</span></div>
              <div className="day-box checked"><span>W</span><span className="check-dot">✓</span></div>
              <div className="day-box"><span>T</span><span className="check-dot"></span></div>
              <div className="day-box"><span>F</span><span className="check-dot"></span></div>
              <div className="day-box"><span>S</span><span className="check-dot"></span></div>
              <div className="day-box"><span>S</span><span className="check-dot"></span></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;