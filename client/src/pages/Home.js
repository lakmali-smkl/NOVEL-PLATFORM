import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import myVideo from './backgroundVideo.mp4';

const Home = () => {
  return (
    <div className="home-container">
     
      <video autoPlay loop muted playsInline className="video-background">
        <source src={myVideo} type="video/mp4" />
      </video>

     
      <section className="hero-overlay">
        <h1>Welcome to My Novel Hub</h1>
        <p>Explore, read, and share your favorite stories and articles.</p>
        
        <div className="cta-buttons">
          <Link to="/register" className="btn-red">Sign Up</Link>
          <Link to="/login" className="btn-red">Login</Link>
        </div>
      </section>
    </div>
  );
};

export default Home;