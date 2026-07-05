import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Profile Picture File & Preview
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState('');

  // UI State
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('user'));
    if (!localUser) {
      navigate('/login');
      return;
    }
    setUser(localUser);
    setUsername(localUser.username || '');
    setEmail(localUser.email || '');
    if (localUser.profilePicture) {
      setProfilePicturePreview(`http://localhost:5000/${localUser.profilePicture}`);
    }
  }, [navigate]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      setProfilePicturePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    // Password validation
    if (newPassword) {
      if (!currentPassword) {
        return setError("Please enter your current password to change it.");
      }
      if (newPassword !== confirmPassword) {
        return setError("New passwords do not match.");
      }
      if (newPassword.length < 6) {
        return setError("New password must be at least 6 characters.");
      }
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      if (currentPassword) formData.append('currentPassword', currentPassword);
      if (newPassword) formData.append('newPassword', newPassword);
      if (profilePictureFile) {
        formData.append('profilePicture', profilePictureFile);
      }

      const res = await fetch(`http://localhost:5000/api/users/${user._id || user.id}/settings`, {
        method: 'PUT',
        body: formData
        // Note: Do not set Content-Type header when using FormData; the browser sets it automatically with boundary.
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Settings updated successfully!");
        
        // Update local storage and component state
        const updatedUser = { 
          ...user, 
          username: data.user.username, 
          email: data.user.email,
          profilePicture: data.user.profilePicture 
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        // Update preview from server-normalized path
        if (data.user.profilePicture) {
          setProfilePicturePreview(`http://localhost:5000/${data.user.profilePicture}`);
        }

        // Reset password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setProfilePictureFile(null);
      } else {
        setError(data.error || data.message || "Failed to update settings.");
      }
    } catch (err) {
      console.error("Settings error:", err);
      setError("A server error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Account Settings</h1>
        <p>Update your personal information, profile picture and security credentials.</p>
      </div>

      <div className="settings-card">
        {message && <div className="settings-alert success">{message}</div>}
        {error && <div className="settings-alert error">{error}</div>}

        <form onSubmit={handleSubmit} className="settings-form" encType="multipart/form-data">
          <div className="form-section">
            <h3>Profile Image</h3>
            <div className="profile-pic-settings-section">
              <div className="settings-avatar-preview-wrap">
                {profilePicturePreview ? (
                  <img src={profilePicturePreview} alt="Avatar Preview" className="settings-avatar-img" />
                ) : (
                  <div className="settings-avatar-placeholder">
                    {username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="upload-controls">
                <label className="file-upload-btn">
                  Choose Photo
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
                <p className="upload-tip">Accepts JPG, PNG, GIF files. (Max 5MB)</p>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Profile Information</h3>
            
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Change Password</h3>
            <p className="section-hint">Leave these blank if you don't want to change your password.</p>
            
            <div className="form-group">
              <label>Current Password</label>
              <input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                placeholder="Required to set a new password"
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className={`save-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;