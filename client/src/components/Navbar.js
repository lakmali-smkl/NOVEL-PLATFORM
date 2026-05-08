// Navbar.js
import React , { useState, useEffect } from 'react';
import { Link , useNavigate , useLocation} from 'react-router-dom';
import axios from 'axios';
import './Navbar.css';

const Navbar = ({ user, setUser, toggleSidebar ,closeSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  
  const isLibraryPage = location.pathname === '/library';

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user?._id) {
        try {
          const res = await axios.get(`http://localhost:5000/api/notifications/unread/${user._id}`);
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
    navigate('/'); 
  }; 

  return (
    <nav className="navbar">
      <div className="nav-left">
        {user && (
          <button className="menu-btn" onClick={toggleSidebar}>
            ☰
          </button>
        )}
        <Link to="/" className="nav-link">Home</Link>
        {!isLibraryPage && (
          <Link to="/library" className="nav-link">Library</Link>
        )}
      </div>

      <ul className="nav-right">
        {user ? (
          <>

            {/* NOTIFICATION BELL */}
            <li className="nav-item">
              <Link to="/notifications" className="nav-link notif-wrapper">
                <span className="notif-icon">🔔</span>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </Link>
            </li>
            
            <li>
              <button onClick={handleLogout} className="nav-btn">Logout</button>
            </li>
          </>
        ) : (
          <>
            <li><Link to="/login" className="nav-link">Login</Link></li>
            <li><Link to="/register" className="nav-link">Register</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;