import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
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
        <Route path="/" element={<Home user={user} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/dashboard" element={<Dashboard isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />}>
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