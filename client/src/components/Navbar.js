// Navbar.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useTheme, THEMES } from '../ThemeContext';
import './Navbar.css';

import { API_BASE_URL } from '../config';
// Helper to convert hex to rgba
const hexToRgba = (hex, alpha) => {
  if (!hex) return '';
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const Navbar = ({ user, setUser, toggleSidebar, closeSidebar, isSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const { theme, setTheme, currentTheme } = useTheme();
  const themeMenuRef = useRef(null);

  const isLibraryPage = location.pathname === '/library';
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user?._id) {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/notifications/unread/${user._id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          setUnreadCount(res.data.count);
        } catch (err) {
          console.error("Error fetching unread notifications", err);
        }
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Check every 1 minute
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    if (closeSidebar) {
      closeSidebar();
    }
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <nav 
      className="navbar" 
      style={{ 
        backgroundColor: hexToRgba(currentTheme.navbar, 0.85),
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${hexToRgba(currentTheme.accent, 0.2)}`,
        boxShadow: `0 4px 30px rgba(0, 0, 0, 0.15)`
      }}
    >
      <div className="nav-left">
        {user && (
          <button className="menu-btn" onClick={toggleSidebar} aria-label="Toggle Sidebar" aria-expanded={isSidebarOpen}>
            <span className={`menu-btn-icon ${isSidebarOpen ? 'open' : ''}`}></span>
          </button>
        )}
        <Link to="/" className="nav-brand">
          <span className="brand-logo">📖</span>
          <span className="brand-text">Lumiverse</span>
        </Link>
        <div className="nav-links-group">
          <Link to="/" className={`nav-link ${isHomePage ? 'active' : ''}`}>
            Home
          </Link>
          {!isLibraryPage && (
            <Link to="/library" className={`nav-link ${isLibraryPage ? 'active' : ''}`}>
              Library
            </Link>
          )}
        </div>
      </div>

      <ul className="nav-right">
        {/* THEME INDICATOR — only shown once logged in */}
        {user && (
          <li className="nav-item theme-menu-wrapper" ref={themeMenuRef}>
            <button
              type="button"
              className="theme-indicator-btn"
              title={`Theme: ${currentTheme.name}`}
              onClick={() => setThemeMenuOpen((open) => !open)}
              style={{
                borderColor: hexToRgba(currentTheme.accent, 0.3),
                background: hexToRgba(currentTheme.accent, 0.08)
              }}
            >
              <span
                className="theme-dot"
                style={{ background: currentTheme.accent }}
              />
              <span className="theme-indicator-label">{currentTheme.emoji}</span>
            </button>

            {themeMenuOpen && (
              <div className="theme-menu-dropdown">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`theme-menu-option ${theme === t.id ? 'active' : ''}`}
                    onClick={() => {
                      setTheme(t.id);
                      setThemeMenuOpen(false);
                    }}
                  >
                    <span className="theme-menu-dot" style={{ background: t.accent }} />
                    <span className="theme-menu-emoji">{t.emoji}</span>
                    <span className="theme-menu-name">{t.name}</span>
                    {theme === t.id && <span className="theme-menu-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </li>
        )}

        {user ? (
          <>
            {/* NOTIFICATION BELL */}
            <li className="nav-item">
              <Link to="/notifications" className="nav-link notif-wrapper" aria-label="Notifications">
                <span className="notif-icon">🔔</span>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </Link>
            </li>

            <li>
              <button onClick={handleLogout} className="logout-btn-nav">
                Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li><Link to="/login" className="nav-link nav-link-auth">Login</Link></li>
            <li><Link to="/register" className="nav-link nav-link-auth-btn">Register</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;