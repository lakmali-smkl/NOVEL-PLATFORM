import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Notifications.css';

import { API_BASE_URL } from '../config';
const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

const getIcon = (type) => {
  switch (type) {
    case 'like': return '❤️';
    case 'comment': return '💬';
    case 'reply': return '↩️';
    default: return '🔔';
  }
};

const getBadgeColor = (type) => {
  switch (type) {
    case 'like': return 'badge-like';
    case 'comment':
    case 'reply':
      return 'badge-comment';
    default: return 'badge-default';
  }
};

const Notifications = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const authHeaders = { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } };
      const res = await axios.get(`${API_BASE_URL}/api/notifications/${user._id}`, authHeaders);
      setNotifications(res.data || []);
      // Mark all as read silently
      await axios.put(`${API_BASE_URL}/api/notifications/read-all/${user._id}`, {}, authHeaders);
    } catch (err) {
      console.error('Error fetching notifications', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await axios.delete(`${API_BASE_URL}/api/notifications/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error('Error deleting notification', err);
    }
  };

  const handleClearAll = async () => {
    try {
      const authHeaders = { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } };
      await Promise.all(notifications.map((n) => axios.delete(`${API_BASE_URL}/api/notifications/${n._id}`, authHeaders)));
      setNotifications([]);
    } catch (err) {
      console.error('Error clearing all notifications', err);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'likes') return n.type === 'like';
    if (filter === 'comments') return n.type === 'comment' || n.type === 'reply';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const resolveLink = (n) => {
    let type = n.contentType;
    if (!type && n.message) {
      if (n.message.toLowerCase().includes('novel')) type = 'novel';
      else if (n.message.toLowerCase().includes('article')) type = 'article';
    }
    if (!n.contentId || !type) return null;

    const params = new URLSearchParams();
    if (n.commentId) params.set('commentId', n.commentId);
    if (n.replyId) params.set('replyId', n.replyId);
    const qs = params.toString();

    return `/read/${type}/${n.contentId}${qs ? `?${qs}` : ''}`;
  };

  const tabs = [
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'likes', label: 'Likes', count: notifications.filter((n) => n.type === 'like').length },
    { key: 'comments', label: 'Comments', count: notifications.filter((n) => n.type === 'comment' || n.type === 'reply').length },
  ];

  return (
    <div className="notif-page">
      {/* Header */}
      <div className="notif-header-section">
        <div className="notif-title-row">
          <div className="notif-title-left">
            <span className="notif-bell">🔔</span>
            <h1 className="notif-heading">Notifications</h1>
            {unreadCount > 0 && (
              <span className="notif-unread-badge">{unreadCount} new</span>
            )}
          </div>
          {notifications.length > 0 && (
            <button className="notif-clear-all-btn" onClick={handleClearAll}>
              Clear All
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="notif-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`notif-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`notif-tab-count ${filter === tab.key ? 'active' : ''}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="notif-body">
        {loading ? (
          <div className="notif-loading">
            <div className="notif-spinner" />
            <p>Loading notifications…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="notif-empty">
            <div className="notif-empty-icon">🔕</div>
            <p className="notif-empty-title">Nothing here yet</p>
            <p className="notif-empty-sub">
              {filter === 'all'
                ? 'You have no notifications.'
                : `No ${filter} yet.`}
            </p>
          </div>
        ) : (
          <div className="notif-list">
            {filtered.map((n) => {
              const link = resolveLink(n);
              const isUnread = !n.isRead;

              const inner = (
                <div className={`notif-item ${isUnread ? 'unread' : 'read'}`}>
                  <div className={`notif-icon-wrap ${getBadgeColor(n.type)}`}>
                    <span className="notif-icon">{getIcon(n.type)}</span>
                  </div>
                  <div className="notif-content">
                    <p className="notif-message">{n.message}</p>
                    <span className="notif-meta">
                      <span className="notif-time">{timeAgo(n.createdAt)}</span>
                      {link && (
                        <span className="notif-go-label">Click to view →</span>
                      )}
                    </span>
                  </div>
                  {isUnread && <span className="notif-dot" />}
                  <button
                    className="notif-delete-btn"
                    onClick={(e) => handleDelete(n._id, e)}
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              );

              return link ? (
                <Link key={n._id} to={link} className="notif-link-row">
                  {inner}
                </Link>
              ) : (
                <div key={n._id} className="notif-link-row">
                  {inner}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;