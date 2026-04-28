import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import myVideo from './backgroundVideo.mp4';

const Home = ({ user }) => {
  const [trending, setTrending] = useState([]);

  // Fetch data only if user is logged in
  useEffect(() => {
    if (user) {
      fetch('http://localhost:5000/api/novels')
        .then(res => res.json())
        .then(data => setTrending(data.slice(0, 3)))
        .catch(err => console.error("Error loading trending:", err));
    }
  }, [user]);

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
                  <img src={`http://localhost:5000/${item.coverPhoto}`} alt={item.title} />
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