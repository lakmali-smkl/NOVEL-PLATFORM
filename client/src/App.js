import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AddNovel from './pages/AddNovel';
//import NovelList from './pages/NovelList';
import AddArticle from './pages/AddArticle';
//import ArticleList from './pages/ArticleList';
import Library from './pages/Library';

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

  return (
    <>
      <Navbar 
        user={user} 
        setUser={setUser} 
        toggleSidebar={toggleSidebar} 
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register />} />
        
        {/* User Dashboard */}
        <Route 
          path="/dashboard/*" 
          element={<Dashboard isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />} 
        />
        
        {/* Admin Specific Routes */}
        <Route path="/admin-dashboard" element={<AdminDashboard user={user} />} />
        <Route path="/add-novel" element={<AddNovel user={user} />} />
        <Route path="/add-article" element={<AddArticle />} />
        <Route path="/library" element={<Library />} />
      </Routes>
    </>
  );
}

export default App;