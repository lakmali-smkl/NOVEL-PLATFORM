import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AddNovel from './pages/AddNovel';
import AddArticle from './pages/AddArticle';
import Library from './pages/Library';
import ReadPage from './pages/ReadPage';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Only show sidebar for logged-in non-admin users
  const showSidebar = user && !user.isAdmin;

  return (
    <>
      <Navbar 
        user={user} 
        setUser={setUser} 
        toggleSidebar={toggleSidebar} 
      />
      
      {/* Global Sidebar for regular users */}
      {showSidebar && (
        <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
          <button className="close-btn" onClick={() => setIsSidebarOpen(false)}>
            ✕
          </button>
          <h2>My Dashboard</h2>
          <ul>
            <li><Link to="/dashboard/favorites" onClick={() => setIsSidebarOpen(false)}>Favorites</Link></li>
            <li><Link to="/dashboard/profile" onClick={() => setIsSidebarOpen(false)}>Profile</Link></li>
          </ul>
        </aside>
      )}
      
      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/dashboard" element={<Dashboard />}>
          <Route path="favorites" element={<Favorites />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        
        <Route path="/admin-dashboard" element={<AdminDashboard user={user} />} />
        <Route path="/add-novel" element={<AddNovel user={user} />} />
        <Route path="/add-article" element={<AddArticle />} />
        <Route path="/library" element={<Library />} />
        <Route path="/read/:type/:id" element={<ReadPage />} />
        
      </Routes>
    </>
  );
}

export default App;