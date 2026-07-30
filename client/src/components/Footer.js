import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = ({ user }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-glow"></div>
      <div className={`footer-container ${!user?.isWriter ? 'three-columns' : ''}`}>
        
        {/* Brand & Mission Column */}
        <div className="footer-column brand-column">
          <h3 className="footer-logo">
            LUMI <span className="logo-accent">VERSE</span>
          </h3>
          <p className="brand-desc">
            A premium digital writing and reading sanctuary. Explore thousands of user-submitted creative works, or publish your own and build your audience.
          </p>
          <div className="social-links">
            <a href="https://github.com/lakmali-smkl" target="_blank" rel="noreferrer" className="social-icon" aria-label="GitHub">
              <svg viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="Twitter">
              <svg viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Quick Links Column */}
        <div className="footer-column">
          <h4>Explore</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/library">Library</Link></li>
            {user && <li><Link to="/notifications">Notifications</Link></li>}
            {!user && <li><Link to="/login">Sign In</Link></li>}
            {!user && <li><Link to="/register">Register</Link></li>}
          </ul>
        </div>

        {/* Create / Publish Column - Only for Writers */}
        {user?.isWriter && (
          <div className="footer-column">
            <h4>Publish</h4>
            <ul className="footer-links">
              <li><Link to="/add-novel">Publish Novel</Link></li>
              <li><Link to="/add-article">Write Article</Link></li>
              <li><Link to="/writer-dashboard">Writer Hub</Link></li>
            </ul>
          </div>
        )}

        {/* Developer Attribution Column */}
        <div className="footer-column developer-column">
          <h4>Developer</h4>
          <p className="dev-name">Kasunika Lakmali</p>
          <p className="dev-title">Computer Science Student & Full-Stack Developer</p>
          <span className="dev-tag">MERN Stack Project</span>
        </div>

      </div>

      {/* Footer Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p className="copyright">
            &copy; {currentYear} Lumiverse. All rights reserved.
          </p>
          <div className="footer-bottom-links">
            {user && <Link to="/settings">Settings</Link>}
            {user && <span className="divider">•</span>}
            <a href="#privacy">Privacy Policy</a>
            <span className="divider">•</span>
            <a href="#terms">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
