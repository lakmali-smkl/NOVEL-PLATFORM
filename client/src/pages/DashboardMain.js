import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './DashboardMain.css';

const API = 'http://localhost:5000';

const DashboardMain = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [stats, setStats] = useState({ favoritesCount: 0, historyCount: 0, collectionsCount: 0 });

  const userId = user?._id || user?.id;

  useEffect(() => {
    if (!userId) return;

    // Sync latest localStorage user
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
      <div className="dashboard-main-container empty-dashboard">
        <p>Please log in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-main-container">
      <div className="dashboard-bg-glow glow-1"></div>
      <div className="dashboard-bg-glow glow-2"></div>

      {/* ── Dashboard Welcome Header ── */}
      <header className="dashboard-welcome-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome back, {user.username}. Here is your reading status at a glance.</p>
      </header>

      {/* ── Stats Cards Row ── */}
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

      {/* ── Reading Activity & Goals Widget ── */}
      <div className="dashboard-activity-section">
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
  );
};

export default DashboardMain;
