import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WriterDashboard from './pages/WriterDashboard';
import AddNovel from './pages/AddNovel';
import AddArticle from './pages/AddArticle';
import WriterDashboardMain from './pages/WriterDashboardMain';
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
import UserSidebar from './pages/UserSidebar';
import RequestWriter from './pages/RequestWriter';
import Notifications from './pages/Notifications';
import CollectionDetail from './pages/CollectionDetail';

import './App.css';

function App() {
  const [user, setUser] = useState(() => {
    // Load user from localStorage on mount
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const location = useLocation(); // 💡 Track current route changes
  const navigate = useNavigate(); // 💡 To programmatically kick out suspended users

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setIsSidebarOpen(false);
    setTimeout(() => setIsLoggingOut(false), 500);
  };

  useEffect(() => {
    const syncUserRoleAndStatus = async () => {
      // If no user session exists, skip checks
      if (!user || !user._id) return;

      try {
        // 1. First, call the backend to check if the user account is active or suspended
        const statusResponse = await fetch(`http://localhost:5000/api/users/check-status/${user._id}`);
        if (!statusResponse.ok) return;

        const statusData = await statusResponse.json();

        // 🛑 CRITICAL REJECTION GUARD: Kick out immediately if account status is suspended
        if (statusData.status === 'suspended') {
          alert("⚠️ Your account has been suspended by an administrator. Access revoked.");
          localStorage.removeItem('user');
          setUser(null);
          setIsSidebarOpen(false);
          navigate('/login');
          return; // Stop further execution
        }

        // 2. Synchronize permissions / roles if the user is an active standard reader
        if (!user.isWriter && !user.isAdmin) {
          const roleResponse = await fetch(`http://localhost:5000/api/users/status/${user._id}`);
          if (!roleResponse.ok) return; // Exit if server error

          const roleData = await roleResponse.json();

          if (roleData.isWriter) {
            const updatedUser = { ...user, isWriter: true };

            // These lines trigger the "Red Theme" switch
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            localStorage.removeItem('writerRequestStatus');

            console.log("Role updated: User is now a Writer.");
          } else {
            const updatedUser = { ...user };
            let changed = false;

            if (roleData.isWriter && !user.isWriter) {
              updatedUser.isWriter = true;
              updatedUser.writerRequestStatus = 'approved';
              changed = true;
            }

            if (roleData.writerRequestStatus && roleData.writerRequestStatus !== user.writerRequestStatus) {
              updatedUser.writerRequestStatus = roleData.writerRequestStatus;
              changed = true;
            }

            if (changed) {
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }

            if (roleData.writerRequestStatus !== 'pending') {
              localStorage.removeItem('writerRequestStatus');
            }

            if (roleData.writerRequestStatus === 'rejected') {
              console.log("Request rejected: Cleared pending status.");
            }
          }
        }
      } catch (err) {
        console.error("Account validation or role sync failed:", err);
      }
    };

    // Run the validation check when mounting pages or moving between path routes
    syncUserRoleAndStatus();
  }, [user, location.pathname, navigate]); // Re-runs on view changing paths or user state mutation


  const isAdmin = user && user.isAdmin;
  const isWriter = user && user.isWriter && !user.isAdmin;
  const isRegularUser = user && !user.isWriter && !user.isAdmin;

  // Only show footer on the home page when the user is not logged in
  const showFooter = !user && location.pathname === '/';

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

      <div className={`main-layout ${user && isSidebarOpen ? "main-content-shifted" : ""}`}>
        <div className="content-area">
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register />} />

            {isAdmin && (
              <>
                <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/*" element={<AdminDashboard />} />
              </>
            )}

            <Route path="/dashboard" element={<Dashboard user={user} />}>
              <Route path="favorites" element={<Favorites />} />
              <Route path="profile" element={<Profile />} />
              <Route path="my-novels" element={<MyPublications />} />
              <Route path="read-later" element={<ReadLater user={user} />} />
              <Route path="collections/:collectionId" element={<CollectionDetail />} />
              <Route path="history" element={<ReadingHistory />} />
              <Route path="settings" element={<Settings setUser={setUser} />} />
              <Route path="request-writer" element={<RequestWriter user={user} setUser={setUser} />} />
            </Route>

            <Route path="/writer-dashboard" element={<WriterDashboard user={user} setUser={setUser} />}>
              <Route index element={<WriterDashboardMain user={user} setUser={setUser} />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings setUser={setUser} />} />
              <Route path="favorites" element={<Favorites />} />
            </Route>
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
        {showFooter && <Footer user={user} />}
      </div>
    </div>
  );
}

export default App;