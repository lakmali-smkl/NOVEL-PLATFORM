import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom'; 
import './Home.css';
import myVideo from './backgroundVideo.mp4';

const Home = ({ user }) => {
  const [trending, setTrending] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const API_BASE_URL = 'http://localhost:5000'; 

  useEffect(() => {
    if (user && !user.isWriter && !user.isAdmin) {
      fetch(`${API_BASE_URL}/api/novels`)
        .then(res => res.json())
        .then(data => setTrending(data.slice(0, 3)))
        .catch(err => console.error("Error loading trending:", err));
    }

    if (user) {
      fetch(`http://localhost:5000/api/announcements`)
        .then(res => {
        if (!res.ok) throw new Error("Route not found on server");
        return res.json();
      })
        .then(data => setAnnouncements(data))
        .catch(err => console.error("Error loading announcements:", err));
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
        <h1>Welcome to My Novel Hub</h1>
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