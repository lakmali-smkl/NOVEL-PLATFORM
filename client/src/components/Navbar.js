// Navbar.js
import React from 'react';
import { Link , useNavigate , useLocation} from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ user, setUser, toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname.includes('dashboard') || location.pathname.includes('add-novel');
  const isLibraryPage = location.pathname === '/library';

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user'); 
    navigate('/'); 
  }; 

  return (
    <nav className="navbar">
      <div className="nav-left">
        {user && !user.isAdmin && (
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
            {user.isAdmin && !isDashboard && !isLibraryPage &&(
              <li>
                <Link to="/dashboard/add-creation" className="nav-link admin-link">
                  + Add Novel
                </Link>
              </li>
            )}
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