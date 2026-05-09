import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
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
import AdminSidebar from './pages/AdminSidebar'; 
import AdminDashboard from './pages/AdminDashboard';
import WriterRequests from './pages/WriterRequests'; 
import UserSidebar from './pages/UserSidebar'; 
import RequestWriter from './pages/RequestWriter';
import Notifications from './pages/Notifications';

import './App.css';

function App() {
  const [user, setUser] = useState(() => {
    // Load user from localStorage on mount
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = () => {
    setIsLoggingOut(true); 
    localStorage.removeItem('user'); 
    setUser(null); 
    setIsSidebarOpen(false); 
    setTimeout(() => setIsLoggingOut(false), 500);
  };

  useEffect(() => {
  const syncUserRole = async () => {
    // Only check if the user is logged in and NOT already a writer
    if (user && !user.isWriter && !user.isAdmin) {
      try {
        const response = await fetch(`http://localhost:5000/api/users/status/${user._id}`);
        
        if (!response.ok) return; // Exit if server error
        
        const data = await response.json();

        if (data.isWriter) {
          const updatedUser = { ...user, isWriter: true };
          
          // These three lines trigger the "Red Theme" switch
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          localStorage.removeItem('writerRequestStatus');
          
          console.log("Role updated: User is now a Writer.");
        } else if (data.writerRequestStatus === 'rejected') {
          // Update user object with rejected status
          const updatedUser = { ...user, writerRequestStatus: 'rejected' };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          // Clear pending status if request was rejected
          localStorage.removeItem('writerRequestStatus');
          console.log("Request rejected: Cleared pending status.");
        }
      } catch (err) {
        console.error("Role sync failed:", err);
      }
    }
  };

  // Run the check when the component mounts or the user object changes
  syncUserRole();
}, [user]); // Important: Re-run if the user object changes


  const isAdmin = user && user.isAdmin;
  const isWriter = user && user.isWriter && !user.isAdmin;
  const isRegularUser = user && !user.isWriter && !user.isAdmin;

  return (
    <div className={isLoggingOut ? "no-transition" : ""}>
      <Navbar 
        user={user} setUser={setUser} 
        handleLogout={handleLogout} 
        toggleSidebar={toggleSidebar} closeSidebar={closeSidebar}
      />

      <aside className={`sidebar 
        ${isAdmin ? 'admin-theme' : ''} 
        ${isWriter ? 'writer-theme' : ''} 
        ${isRegularUser ? 'user-theme' : ''} 
        ${isSidebarOpen ? 'active' : ''}`}>
        
        {isAdmin && <AdminSidebar user={user} closeSidebar={closeSidebar} />}
        {isWriter && <WriterSidebar user={user} closeSidebar={closeSidebar} />}
        {isRegularUser && <UserSidebar user={user} closeSidebar={closeSidebar} />}
      </aside>

      <div className={user && isSidebarOpen ? "main-content-shifted" : ""}>
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register />} />
          
          {isAdmin && (
            <>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/admin/writer-requests" element={<WriterRequests />} />
            </>
          )}

          <Route path="/dashboard" element={<Dashboard />}>
            <Route path="favorites" element={<Favorites />} />
            <Route path="profile" element={<Profile />} />
            <Route path="my-novels" element={<MyPublications />} />
            <Route path="read-later" element={<ReadLater />} />
            <Route path="history" element={<ReadingHistory />} />
            <Route path="settings" element={<Settings />} />
            <Route path="request-writer" element={<RequestWriter user={user} />} />
          </Route>
          
          <Route path="/writer-dashboard" element={<WriterDashboard user={user} />} />
            <Route path="/add-novel" element={<AddNovel user={user} />} />
            <Route path="/add-article" element={<AddArticle user={user} />} />
            <Route path="/library" element={<Library />} />
            <Route path="/read/:type/:id" element={<ReadPage />} />
            <Route path="/edit-novel/:id" element={<EditNovel user={user} />} />
            <Route path="/edit-article/:id" element={<EditArticle />} />
            <Route path="/notifications" element={<Notifications user={user} />} />
            <Route path="favorites" element={<Favorites />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;