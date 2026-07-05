import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './DashboardMain.css';

const API = 'http://localhost:5000';

const DashboardMain = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [stats, setStats] = useState({ favoritesCount: 0, historyCount: 0, collectionsCount: 0 });
  const [recentHistory, setRecentHistory] = useState([]);
  const [recentFavorites, setRecentFavorites] = useState([]);
  const [collections, setCollections] = useState([]);

  const userId = user?._id || user?.id;

  useEffect(() => {
    if (!userId) return;

    const localUser = JSON.parse(localStorage.getItem('user'));
    if (localUser) setUser(localUser);

    if (localUser?.favorites) {
      setStats(prev => ({ ...prev, favoritesCount: localUser.favorites.length }));
      setRecentFavorites(localUser.favorites.slice(0, 3));
    }

    fetch(`${API}/api/collections/${userId}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStats(prev => ({ ...prev, collectionsCount: data.length }));
          setCollections(data.slice(0, 3));
        }
      })
      .catch(() => {});

    fetch(`${API}/api/users/${userId}/history`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStats(prev => ({ ...prev, historyCount: data.length }));
          setRecentHistory(data.slice(0, 3));
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

  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60)   return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="dashboard-main-container">
      <div className="dashboard-bg-glow glow-1"></div>
      <div className="dashboard-bg-glow glow-2"></div>

      {/* ── Welcome Header ── */}
      <header className="dashboard-welcome-header">
        <h1>Dashboard Overview</h1>
        <p>Welcome back, {user.username}. Track your library, streak, and recent reads here.</p>
      </header>

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

      <div className="dashboard-two-col">

        {/* ── LEFT COLUMN ── */}
        <div className="dashboard-left-col">

          {/* Continue Reading */}
          {recentHistory.length > 0 && (
            <div className="info-card">
              <div className="card-header-row">
                <h3>🕒 Continue Reading</h3>
                <Link to="/dashboard/history" className="see-all-link">See all →</Link>
              </div>
              <div className="recent-list">
                {recentHistory.map(item => (
                  <Link
                    to={`/read/${item.type}/${item.contentId}`}
                    key={item.contentId}
                    className="recent-item"
                  >
                    <div className="recent-item-icon">
                      {item.type === 'novel' ? '📖' : '📝'}
                    </div>
                    <div className="recent-item-info">
                      <span className="recent-item-title">{item.title}</span>
                      <span className="recent-item-meta">{timeAgo(item.lastRead)}</span>
                    </div>
                    <span className="recent-item-arrow">›</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quick Shelves */}
          {collections.length > 0 && (
            <div className="info-card">
              <div className="card-header-row">
                <h3>🔖 Quick Shelves</h3>
                <Link to="/dashboard/read-later" className="see-all-link">Manage →</Link>
              </div>
              <div className="shelves-mini-grid">
                {collections.map(folder => (
                  <Link to={`/dashboard/collections/${folder._id}`} key={folder._id} className="shelf-mini-card">
                    <span className="shelf-mini-icon">{folder.icon || '📁'}</span>
                    <div className="shelf-mini-meta">
                      <h4>{folder.name}</h4>
                      <p>{folder.savedItems?.length || 0} items</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Favorites */}
          {recentFavorites.length > 0 && (
            <div className="info-card">
              <div className="card-header-row">
                <h3>❤️ Recent Favorites</h3>
                <Link to="/dashboard/favorites" className="see-all-link">See all →</Link>
              </div>
              <div className="recent-list">
                {recentFavorites.map(item => (
                  <Link
                    to={`/read/${item.type}/${item.contentId}`}
                    key={item.contentId}
                    className="recent-item"
                  >
                    <div className="recent-item-icon">
                      {item.type === 'novel' ? '📖' : '📝'}
                    </div>
                    <div className="recent-item-info">
                      <span className="recent-item-title">{item.title}</span>
                      <span className="recent-item-meta">{item.type}</span>
                    </div>
                    <span className="recent-item-arrow">›</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="dashboard-right-col">

          {/* Reading Streak & Activity */}
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

          {/* Quick Actions */}
          <div className="info-card">
            <h3>⚡ Quick Actions</h3>
            <div className="quick-actions-grid">
              <Link to="/library" className="quick-action-btn">
                <span>📚</span>
                <span>Browse Library</span>
              </Link>
              <Link to="/dashboard/read-later" className="quick-action-btn">
                <span>🔖</span>
                <span>My Collections</span>
              </Link>
              <Link to="/dashboard/history" className="quick-action-btn">
                <span>🕒</span>
                <span>Reading History</span>
              </Link>
              <Link to="/dashboard/settings" className="quick-action-btn">
                <span>⚙️</span>
                <span>Settings</span>
              </Link>
            </div>
          </div>

          {/* Writer CTA — only for non-writers */}
          {!user.isWriter && !user.isAdmin && (
            <div className="writer-cta-card">
              <div className="writer-cta-icon">✍️</div>
              <div className="writer-cta-text">
                <h4>Become a Writer</h4>
                <p>Share your stories with thousands of readers on the platform.</p>
              </div>
              <Link to="/dashboard/request-writer" className="writer-cta-btn">
                Apply Now →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardMain;
