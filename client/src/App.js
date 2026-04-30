import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WriterDashboard from './pages/WriterDashboard';
import AddNovel from './pages/AddNovel';
import AddArticle from './pages/AddArticle';
import Library from './pages/Library';
import ReadPage from './pages/ReadPage';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import EditNovel from './pages/EditNovel';
import MyPublications from './pages/MyPublications';
import ReadLater from './pages/ReadLater';
import ReadingHistory from './pages/ReadingHistory';
import Settings from './pages/Settings';
import EditArticle from './pages/EditArticle';
import WriterSidebar from './pages/WriterSidebar';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true); // Step 1: Disable animations immediately
    
    localStorage.removeItem('user'); // Step 2: Clear storage
    setUser(null); // Step 3: Clear state
    setIsSidebarOpen(false); // Step 4: Close sidebar[cite: 5]

    // Step 5: Reset the flag after a short delay so login/sidebar works normally later
    setTimeout(() => setIsLoggingOut(false), 500);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // This effect watches the 'user' state specifically
  useEffect(() => {
    if (!user) {
      setIsSidebarOpen(false);
    }
  }, [user]); 

  const showRegularSidebar = user && !user.isWriter;
  const showWriterSidebar = user && user.isWriter; // Only for Writers

  return (
    <div className={isLoggingOut ? "no-transition" : ""}>
      <Navbar 
        user={user} 
        setUser={setUser} 
        handleLogout={handleLogout} // Use the new function here[cite: 5]
        toggleSidebar={toggleSidebar} 
        closeSidebar={closeSidebar}
      />

      <aside className={`sidebar ${showWriterSidebar ? 'writer-theme' : ''} ${isSidebarOpen ? 'active' : ''}`}>
        
        {/* REGULAR USER LINKS */}
        {showRegularSidebar && (
          <>
            <div className="sidebar-header">
              <h3>Account</h3>
            </div>
            <ul>
              <li><Link to="/dashboard/profile" onClick={closeSidebar}>👤 Profile</Link></li>
              <li><Link to="/dashboard/favorites" onClick={closeSidebar}>❤️ Favorites</Link></li>
              <li><Link to="/dashboard/read-later" onClick={closeSidebar}>🔖 Read Later</Link></li>
              <li><Link to="/dashboard/history" onClick={closeSidebar}>🕒 Reading History</Link></li>
              <div className="sidebar-divider"></div>
              <div className="sidebar-header"><h3>Creative</h3></div>
              <li><Link to="/dashboard/settings" onClick={closeSidebar}>⚙️ Settings</Link></li>
            </ul>
          </>
        )}

        {/* WRITER PORTAL LINKS (Now using the separate file)[cite: 3, 5] */}
        {showWriterSidebar && (
          <WriterSidebar user={user} closeSidebar={closeSidebar} />
        )}
      </aside>

      <div className={(showRegularSidebar || showWriterSidebar) && isSidebarOpen ? "main-content-shifted" : ""}>
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/dashboard" element={<Dashboard />}>
            <Route path="favorites" element={<Favorites />} />
            <Route path="profile" element={<Profile />} />
            <Route path="my-novels" element={<MyPublications />} />
            <Route path="read-later" element={<ReadLater />} />
            <Route path="history" element={<ReadingHistory />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          <Route path="/writer-dashboard" element={<WriterDashboard user={user} />} />
          <Route path="/add-novel" element={<AddNovel user={user} />} />
          <Route path="/add-article" element={<AddArticle user={user} />} />
          <Route path="/library" element={<Library />} />
          <Route path="/read/:type/:id" element={<ReadPage />} />
          <Route path="/edit-novel/:id" element={<EditNovel user={user} />} />
          <Route path="/edit-article/:id" element={<EditArticle />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;