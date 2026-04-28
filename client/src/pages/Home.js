import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom'; // Added Navigate here
import './Home.css';
import myVideo from './backgroundVideo.mp4';

const Home = ({ user }) => {
  const [trending, setTrending] = useState([]);
  const API_BASE_URL = 'http://localhost:5000'; // Define this once for easy maintenance

  // 1. All Hooks must be at the top level
  useEffect(() => {
    // Only fetch for logged-in regular users
    if (user && !user.isWriter) {
      fetch(`${API_BASE_URL}/api/novels`)
        .then(res => res.json())
        .then(data => setTrending(data.slice(0, 3)))
        .catch(err => console.error("Error loading trending:", err));
    }
  }, [user]);

  // 2. writer Guard: Redirect before rendering the home content
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

        <section className="trending-section">
          <h2 className="section-title">🔥 Trending Now</h2>
          <div className="trending-grid">
            {trending.length > 0 ? (
              trending.map(item => (
                <div key={item._id} className="novel-card">
                  {/* Correctly template the image URL */}
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