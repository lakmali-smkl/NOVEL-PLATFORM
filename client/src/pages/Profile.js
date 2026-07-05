import React, { useState, useEffect } from 'react';
import './Profile.css';

const API = 'http://localhost:5000';

const Profile = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  const userId = user?._id || user?.id;

  useEffect(() => {
    if (!userId) return;

    // Sync latest user details from database (profile photo, username changes)
    const localUser = JSON.parse(localStorage.getItem('user'));
    if (localUser) setUser(localUser);
  }, [userId]);

  if (!user) {
    return (
      <div className="profile-container empty-profile">
        <p>Please log in to view your profile.</p>
      </div>
    );
  }

  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Member';

  const renderAvatar = () => {
    if (user.profilePicture) {
      return (
        <img 
          src={`${API}/${user.profilePicture}`} 
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
    <div className="profile-container profile-simple-view">
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