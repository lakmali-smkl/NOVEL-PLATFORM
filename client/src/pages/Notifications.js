import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Notifications.css';

const Notifications = ({ user }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/notifications/${user._id}`);
        setNotifications(res.data);
        
        // Optional: Mark all as read when opening the page
        await axios.put(`http://localhost:5000/api/notifications/read-all/${user._id}`);
      } catch (err) {
        console.error("Error fetching notifications", err);
      }
    };

    if (user) fetchNotifications();
  }, [user]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((notif) => notif._id !== id));
    } catch (err) {
      console.error("Error deleting notification", err);
    }
  };

  return (
    <div className="notif-page-container">
      <h2>Notifications</h2>
      {notifications.length === 0 ? (
        <p className="no-notif">No new notifications yet.</p>
      ) : (
        <div className="notif-list">
          {notifications.map((n) => (
            <div key={n._id} className={`notif-item ${n.isRead ? 'read' : 'unread'}`}>
              <div className="notif-icon-type">
                {n.type === 'like' ? '❤️' : '💬'}
              </div>
              <div className="notif-content">
                <p className="notif-text">{n.message}</p>
                <span className="notif-time">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <button className="notif-delete-btn" onClick={() => handleDelete(n._id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;