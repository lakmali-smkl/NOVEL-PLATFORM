import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import WriterWelcome from './WriterWelcome';
import './WriterDashboard.css';

const API = 'http://localhost:5000';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const timeAgo = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)    return 'Just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
};

const WriterDashboardMain = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(false);
  const [works, setWorks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Welcome modal
  useEffect(() => {
    if (user?.isWriter && user?.hasSeenWelcome === false) setShowWelcome(true);
  }, [user]);

  const handleCloseWelcome = async () => {
    setShowWelcome(false);
    try {
      await axios.put(`${API}/api/users/update-welcome/${user._id || user.id}`);
      const u = { ...user, hasSeenWelcome: true };
      if (setUser) setUser(u);
      localStorage.setItem('user', JSON.stringify(u));
    } catch (err) { console.error(err); }
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const [novelsRes, articlesRes, notifRes] = await Promise.all([
        axios.get(`${API}/api/novels/author/${user._id}`),
        axios.get(`${API}/api/articles/author/${user._id}`),
        axios.get(`${API}/api/notifications/${user._id}`),
      ]);
      const allWorks = [
        ...novelsRes.data.map(n => ({ ...n, workType: 'novel' })),
        ...articlesRes.data.map(a => ({ ...a, workType: 'article' })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setWorks(allWorks);
      setNotifications((notifRes.data || []).slice(0, 5));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Delete handler
  const handleDelete = async (work) => {
    if (!window.confirm(`Delete "${work.title}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/api/${work.workType}s/${work._id}`);
      setWorks(prev => prev.filter(w => w._id !== work._id));
    } catch (err) { console.error(err); }
  };

  // Stats
  const totalLikes    = works.reduce((s, w) => s + (w.likes?.length || 0), 0);
  const totalComments = works.reduce((s, w) => s + (w.comments?.length || 0), 0);
  const totalViews    = works.reduce((s, w) => s + (w.views || 0), 0);
  const publishedCount = works.filter(w => w.status === 'published').length;
  const draftCount     = works.filter(w => w.status === 'draft').length;

  const stats = [
    { icon: '📚', label: 'Total Works',  value: works.length,    accent: '#3b82f6' },
    { icon: '📢', label: 'Published',    value: publishedCount,  accent: '#22c55e' },
    { icon: '📝', label: 'Drafts',       value: draftCount,      accent: '#f59e0b' },
    { icon: '❤️', label: 'Total Likes',  value: totalLikes,      accent: '#ef4444' },
    { icon: '💬', label: 'Comments',     value: totalComments,   accent: '#8b5cf6' },
    { icon: '👁️', label: 'Total Views',  value: totalViews,      accent: '#06b6d4' },
  ];

  return (
    <div className="wd-page">
      {showWelcome && <WriterWelcome onConfirm={handleCloseWelcome} />}

      {/* ── Background accents ── */}
      <div className="wd-bg-glow wd-glow-1" />
      <div className="wd-bg-glow wd-glow-2" />

      {/* ── Header ── */}
      <header className="wd-header">
        <div className="wd-header-text">
          <p className="wd-greeting">{getGreeting()},</p>
          <h1 className="wd-username">{user?.username}</h1>
          <p className="wd-subtitle">Your creative workspace awaits. Let's write something extraordinary.</p>
        </div>
        <div className="wd-header-actions">
          <button className="wd-create-btn primary" onClick={() => navigate('/add-novel')}>
            <span className="wd-btn-icon">📖</span> New Novel
          </button>
          <button className="wd-create-btn secondary" onClick={() => navigate('/add-article')}>
            <span className="wd-btn-icon">📝</span> New Article
          </button>
        </div>
      </header>

      {/* ── Stats Grid ── */}
      <section className="wd-stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="wd-stat-card" style={{ '--accent': s.accent }}>
            <div className="wd-stat-icon">{s.icon}</div>
            <div className="wd-stat-info">
              <span className="wd-stat-value">{loading ? '—' : s.value.toLocaleString()}</span>
              <span className="wd-stat-label">{s.label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Content Row: Publications + Activity ── */}
      <div className="wd-content-row">
        {/* Publications Table */}
        <section className="wd-card wd-publications">
          <div className="wd-card-header">
            <h2>My Publications</h2>
            <span className="wd-card-badge">{works.length} total</span>
          </div>

          {loading ? (
            <div className="wd-loading">
              <div className="wd-spinner" />
              <p>Loading your works…</p>
            </div>
          ) : works.length === 0 ? (
            <div className="wd-empty">
              <div className="wd-empty-icon">✍️</div>
              <p>No publications yet. Start your writing journey!</p>
              <button className="wd-create-btn primary" onClick={() => navigate('/add-novel')}>
                Create Your First Work
              </button>
            </div>
          ) : (
            <div className="wd-table-wrap">
              <table className="wd-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Likes</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {works.slice(0, 8).map(work => (
                    <tr key={work._id}>
                      <td className="wd-td-title">
                        <Link to={`/read/${work.workType}/${work._id}`} className="wd-title-link">
                          {work.title}
                        </Link>
                      </td>
                      <td>
                        <span className={`wd-type-tag ${work.workType}`}>
                          {work.workType === 'novel' ? '📖' : '📝'} {work.workType}
                        </span>
                      </td>
                      <td>
                        <span className={`wd-status-pill ${work.status}`}>
                          {work.status}
                        </span>
                      </td>
                      <td className="wd-td-num">{work.likes?.length || 0}</td>
                      <td className="wd-td-date">{new Date(work.createdAt).toLocaleDateString()}</td>
                      <td className="wd-td-actions">
                        <Link to={`/edit-${work.workType}/${work._id}`} className="wd-action-btn edit" title="Edit">
                          ✏️
                        </Link>
                        <button className="wd-action-btn delete" onClick={() => handleDelete(work)} title="Delete">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {works.length > 8 && (
                <p className="wd-view-more">Showing 8 of {works.length} — view all in sidebar</p>
              )}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <aside className="wd-card wd-activity">
          <div className="wd-card-header">
            <h2>Recent Activity</h2>
            <Link to="/notifications" className="wd-see-all">View All →</Link>
          </div>

          {notifications.length === 0 ? (
            <div className="wd-empty small">
              <p>No recent activity yet.</p>
            </div>
          ) : (
            <div className="wd-activity-list">
              {notifications.map(n => (
                <div key={n._id} className={`wd-activity-item ${n.isRead ? '' : 'unread'}`}>
                  <span className="wd-activity-icon">
                    {n.type === 'like' ? '❤️' : '💬'}
                  </span>
                  <div className="wd-activity-body">
                    <p className="wd-activity-text">{n.message}</p>
                    <span className="wd-activity-time">{timeAgo(n.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* ── Quick Tips ── */}
      <section className="wd-tips">
        <div className="wd-tip">
          <span className="wd-tip-icon">💡</span>
          <p><strong>Pro tip:</strong> Works start as <em>drafts</em>. Only published works appear in the public library.</p>
        </div>
        <div className="wd-tip">
          <span className="wd-tip-icon">🔔</span>
          <p>Get notified when readers like or comment on your work — check <Link to="/notifications">Notifications</Link>.</p>
        </div>
      </section>
    </div>
  );
};

export default WriterDashboardMain;
