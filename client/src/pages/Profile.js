import React, { useState, useEffect } from 'react';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [stats, setStats] = useState({
    favoritesCount: 0,
    historyCount: 0,
    collectionsCount: 0
  });

  const userId = user?._id || user?.id;

  // 📊 Fetch dynamic statistics and sync newest user profile picture
  useEffect(() => {
    if (!userId) return;

    // Load Favorites Count
    if (user?.favorites) {
      setStats(prev => ({ ...prev, favoritesCount: user.favorites.length }));
    }

    // Sync User details (including profile picture) from database
    fetch(`http://localhost:5000/api/users/check-status/${userId}`)
      .then(async () => {
        // Fetch full profile info or use check-status response, or fetch settings to get full detail.
        // Let's call our main user detail endpoint if we have one, or fetch the user's latest history/data.
        // Since we want to display the user's latest avatar, let's look at the database.
        // We can create a quick GET /api/users/:id route if needed, or get the local storage.
        // Let's check local storage first. The settings page updates local storage upon changes.
        // So local storage is always up-to-date with settings edits!
        const localUser = JSON.parse(localStorage.getItem('user'));
        if (localUser) {
          setUser(localUser);
        }
      })
      .catch(err => console.error("Error syncing profile stats:", err));

    // Load Collections Count
    fetch(`http://localhost:5000/api/collections/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStats(prev => ({ ...prev, collectionsCount: data.length }));
        }
      })
      .catch(err => console.error("Error fetching collections for profile stats:", err));

    // Load History Count
    fetch(`http://localhost:5000/api/users/${userId}/history`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStats(prev => ({ ...prev, historyCount: data.length }));
        }
      })
      .catch(err => console.error("Error fetching history for profile stats:", err));
  }, [userId, user]);

  if (!user) {
    return (
      <div className="profile-container empty-profile">
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  // Get date formatted nicely
  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Member';

  // Render Avatar
  const renderAvatar = () => {
    if (user.profilePicture) {
      return (
        <img 
          src={`http://localhost:5000/${user.profilePicture}`} 
          alt="Profile Avatar" 
          className="avatar-image" 
        />
      );
    }
    return (
      <div className="avatar-placeholder">
        {user.username.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="profile-container">
      {/* 🔮 Background Glows */}
      <div className="profile-bg-glow glow-1"></div>
      <div className="profile-bg-glow glow-2"></div>

      <div className="profile-header">
        <div className="avatar-section">
          {renderAvatar()}
          <div className="user-title-block">
            <div className="username-view-wrap">
              <h1>{user.username}</h1>
            </div>
            <p className="email-text">{user.email}</p>
          </div>
        </div>
      </div>

      {/* 📊 Premium Statistics Grid */}
      <div className="stats-dashboard">
        <div className="stat-card">
          <div className="stat-icon">❤️</div>
          <div className="stat-info">
            <span className="stat-number">{stats.favoritesCount}</span>
            <span className="stat-label">Favorites</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔖</div>
          <div className="stat-info">
            <span className="stat-number">{stats.collectionsCount}</span>
            <span className="stat-label">Saved Collections</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🕒</div>
          <div className="stat-info">
            <span className="stat-number">{stats.historyCount}</span>
            <span className="stat-label">Read Stories</span>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <div className="info-card">
          <h3>Account Information</h3>
          
          <div className="info-row">
            <span>Role / Account Type</span>
            <p className="role-badge">{user.isAdmin ? "Administrator" : user.isWriter ? "Writer" : "Reader"}</p>
          </div>

          <div className="info-row">
            <span>Joined Date</span>
            <p>{joinDate}</p>
          </div>

          <div className="info-row">
            <span>Account Status</span>
            <p className="status-badge-active">Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;