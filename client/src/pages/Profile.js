import React , { useState } from 'react';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');

  const handleSave = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${user._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername })
      });

      if (response.ok) {
        const updatedData = await response.json();
        // Update LocalStorage and State to refresh the UI
        localStorage.setItem('user', JSON.stringify(updatedData));
        setUser(updatedData);
        setIsEditing(false);
        alert("Profile updated successfully!");
      }
    } catch (err) {
      alert("Failed to update profile.");
    }
  };

  if (!user) return <div className="profile-container"><p>Please log in to view your profile.</p></div>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="avatar-placeholder">{user.username.charAt(0).toUpperCase()}</div>
        {isEditing ? (
          <input 
            className="edit-input"
            value={newUsername} 
            onChange={(e) => setNewUsername(e.target.value)} 
          />
        ) : (
          <h1>{user.username}</h1>
        )}
        <p className="email-text">{user.email}</p>
      </div>

      <div className="profile-grid">
        <div className="info-card">
          <h3>Account Information</h3>
          <div className="info-row">
            <span>Username</span>
            <p>{user.username}</p>
          </div>
          <div className="info-row">
            <span>Account Type</span>
            <p>{user.isAdmin ? "Administrator" : "Reader"}</p>
          </div>

          <div className="profile-actions" style={{ marginTop: '20px' }}>
            {isEditing ? (
              <>
                <button className="save-btn" onClick={handleSave}>Save</button>
                <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
              </>
            ) : (
              <button className="edit-btn" onClick={() => setIsEditing(true)}>Edit Username</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;