import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom'; 
import './Home.css';
import myVideo from './backgroundVideo.mp4';
import RecommendationSection from './RecommendationSection';

const Home = ({ user }) => {
  const [trending, setTrending] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({ favoritesCount: 0, historyCount: 0, collectionsCount: 0 });
  const API_BASE_URL = 'http://localhost:5000'; 

  useEffect(() => {
    if (user && !user.isWriter && !user.isAdmin) {
      fetch(`${API_BASE_URL}/api/novels`)
        .then(res => res.json())
        .then(data => setTrending(data.slice(0, 3)))
        .catch(err => console.error("Error loading trending:", err));
    }

    if (user) {
      const userId = user._id || user.id;

      fetch(`http://localhost:5000/api/announcements`)
        .then(res => {
        if (!res.ok) throw new Error("Route not found on server");
        return res.json();
      })
        .then(data => setAnnouncements(data))
        .catch(err => console.error("Error loading announcements:", err));

      // Favorites Count
      if (user.favorites) {
        setStats(prev => ({ ...prev, favoritesCount: user.favorites.length }));
      }

      // Collections Count
      fetch(`http://localhost:5000/api/collections/${userId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setStats(prev => ({ ...prev, collectionsCount: data.length }));
          }
        })
        .catch(() => {});

      // History Count
      fetch(`http://localhost:5000/api/users/${userId}/history`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setStats(prev => ({ ...prev, historyCount: data.length }));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  if (user && user.isAdmin) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  if (user && user.isWriter) {
    return <Navigate to="/writer-dashboard" replace />;
  }

  // --- VIEW 1: Logged In (Discovery) ---
  if (user) {
    return (
      <div className="home-container logged-in-view">
        <header className="welcome-banner">
          <h1>Welcome back, <span>{user.username}</span>!</h1>
          <p>Ready to discover something new today?</p>
        </header>

        {announcements.length > 0 && (
          <div className="announcement-wrapper">
            {announcements.map((ann) => (
              <div key={ann._id} className="ann-terminal-card">
                <div className="ann-scanline"></div>
                
                <div className="ann-indicator-rail">
                  <div className="ann-status-pulse"></div>
                  <div className="ann-rail-line"></div>
                </div>

                <div className="ann-main-body">
                  <div className="ann-meta-row">
                    <div className="ann-tag">
                      <span className="ann-tag-dot"></span>
                      Announcement
                    </div>
                    <div className="ann-timestamp">
                      {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(ann.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <h4 className="ann-headline">{ann.title}</h4>
                  <p className="ann-text">{ann.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ✨ AI Recommendation Engine */}
        <RecommendationSection user={user} />

        {/* 📊 Home Stats Cards */}
        <div className="home-stats-dashboard">
          <Link to="/dashboard/favorites" className="home-stat-card">
            <div className="home-stat-icon">❤️</div>
            <div className="home-stat-info">
              <span className="home-stat-number">{stats.favoritesCount}</span>
              <span className="home-stat-label">Favorites</span>
            </div>
          </Link>
          <Link to="/dashboard/read-later" className="home-stat-card">
            <div className="home-stat-icon">🔖</div>
            <div className="home-stat-info">
              <span className="home-stat-number">{stats.collectionsCount}</span>
              <span className="home-stat-label">Collections</span>
            </div>
          </Link>
          <Link to="/dashboard/history" className="home-stat-card">
            <div className="home-stat-icon">🕒</div>
            <div className="home-stat-info">
              <span className="home-stat-number">{stats.historyCount}</span>
              <span className="home-stat-label">Read Stories</span>
            </div>
          </Link>
        </div>

        {/* 🔥 Reading Activity & Goals Widget */}
        <div className="home-activity-section">
          <div className="home-info-card">
            <h3>🔥 Reading Activity & Goals</h3>
            <div className="home-streak-widget">
              <div className="home-streak-main">
                <span className="home-streak-fire">⚡</span>
                <div className="home-streak-txt">
                  <span className="home-streak-num">3 Days</span>
                  <span className="home-streak-sub">Active Streak</span>
                </div>
              </div>
              <div className="home-streak-ring-box">
                <div className="home-progress-ring-wrap">
                  <svg className="home-progress-svg" viewBox="0 0 36 36">
                    <path className="home-progress-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="home-progress-bar" strokeDasharray="60, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="home-progress-percentage">60%</div>
                </div>
                <div className="home-ring-label">
                  <strong>3 of 5</strong>
                  <span>Weekly Goal</span>
                </div>
              </div>
            </div>
            
            <div className="home-daily-checklist">
              <div className="home-day-box checked"><span>M</span><span className="home-check-dot">✓</span></div>
              <div className="home-day-box checked"><span>T</span><span className="home-check-dot">✓</span></div>
              <div className="home-day-box checked"><span>W</span><span className="home-check-dot">✓</span></div>
              <div className="home-day-box"><span>T</span><span className="home-check-dot"></span></div>
              <div className="home-day-box"><span>F</span><span className="home-check-dot"></span></div>
              <div className="home-day-box"><span>S</span><span className="home-check-dot"></span></div>
              <div className="home-day-box"><span>S</span><span className="home-check-dot"></span></div>
            </div>
          </div>
        </div>

        <section className="trending-section">
          <h2 className="section-title">🔥 Trending Now</h2>
          <div className="trending-grid">
            {trending.length > 0 ? (
              trending.map(item => (
                <div key={item._id} className="novel-card">
                  <img src={`${API_BASE_URL}/${item.coverPhoto}`} alt={item.title} />
                  <h3>{item.title}</h3>
                  <Link to={`/read/novel/${item._id}`} className="read-now-btn">Read Now</Link>
                </div>
              ))
            ) : (
              <p>Loading your library...</p>
            )}
          </div>
        </section>
      </div>
    );
  }

  // --- VIEW 2: Guest (Landing Page) ---
  return (
    <div className="home-container guest-view">
      <video autoPlay loop muted playsInline className="video-background">
        <source src={myVideo} type="video/mp4" />
      </video>
      <section className="hero-overlay">
        <h1>Welcome</h1>
        <p>Explore, read, and share your favorite stories.</p>
        <div className="cta-buttons">
          <Link to="/register" className="btn-red">Sign Up</Link>
          <Link to="/login" className="btn-red">Login</Link>
        </div>
      </section>
    </div>
  );
};

export default Home;