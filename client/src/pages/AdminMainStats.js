import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

import { API_BASE_URL } from '../config';
/* ── Animated count-up hook ── */
const useCountUp = (target, duration = 1400) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
};

/* ── Stat Card ── */
const StatCard = ({ label, value, icon, colorClass, delay, onClick }) => {
  const animated = useCountUp(value);
  return (
    <div className={`stat-card ${colorClass}`} style={{ animationDelay: `${delay}ms` }} onClick={onClick}>
      <div className="stat-glow-ring" />
      <div className="stat-icon-wrap"><span className="stat-icon">{icon}</span></div>
      <div className="stat-info">
        <p className="stat-label">{label}</p>
        <h3 className="stat-value">{animated.toLocaleString()}</h3>
      </div>
      <div className="stat-shimmer" />
    </div>
  );
};

/* ── Relative time helper ── */
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/* ── Main Component ── */
const AdminMainStats = ({ setActiveTab }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [stats,    setStats]    = useState({ totalUsers: 0, totalWriters: 0, pendingApprovals: 0, totalWorks: 0 });
  const [pending,  setPending]  = useState([]);
  const [content,  setContent]  = useState({ novels: 0, articles: 0 });
  const [loading,  setLoading]  = useState(true);
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const authHeaders = { Authorization: `Bearer ${token}` };
        const [statsRes, reqRes, contentRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/admin/stats`,            { headers: authHeaders }),
          axios.get(`${API_BASE_URL}/api/admin/writer-requests`, { headers: authHeaders }),
          axios.get(`${API_BASE_URL}/api/admin/content`,         { headers: authHeaders }),
        ]);
        const statsData = await statsRes.json();
        setStats({
          totalUsers:       statsData.totalUsers       || 0,
          totalWriters:     statsData.totalWriters     || 0,
          pendingApprovals: statsData.pendingApprovals || 0,
          totalWorks:       statsData.totalWorks       || 0,
        });

        // Only show pending requests (max 3)
        const pend = (reqRes.data || []).filter(r => r.status === 'pending').slice(0, 3);
        setPending(pend);

        // Content split
        const novels   = (contentRes.data || []).filter(c => c.contentType === 'novel').length;
        const articles = (contentRes.data || []).filter(c => c.contentType === 'article').length;
        setContent({ novels, articles });
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
        setTimeout(() => setVisible(true), 60);
      }
    };
    load();
  }, [token]);

  /* Quick approve/reject from dashboard */
  const handleQuickAction = async (userId, reqId, action) => {
    try {
      await axios.post(`${API_BASE_URL}/api/admin/approve-writer/${userId}`, { action }, { headers });
      setPending(prev => prev.filter(r => r._id !== reqId));
      setStats(prev => ({
        ...prev,
        pendingApprovals: Math.max(0, prev.pendingApprovals - 1),
        totalWriters: action === 'approve' ? prev.totalWriters + 1 : prev.totalWriters,
      }));
    } catch (e) {
      alert('Action failed. Please try again.');
    }
  };

  if (loading) return (
    <div className="admin-main-content">
      <div className="dash-loader"><div className="dash-spinner" /><p>Initializing Dashboard…</p></div>
    </div>
  );

  const writerPct  = stats.totalUsers > 0 ? Math.round((stats.totalWriters / stats.totalUsers) * 100) : 0;
  const total      = content.novels + content.articles || 1;
  const novelPct   = Math.round((content.novels   / total) * 100);
  const articlePct = Math.round((content.articles / total) * 100);

  return (
    <div className={`admin-main-content ${visible ? 'dash-visible' : ''}`}>

      {/* Background orbs */}
      <div className="dash-orb dash-orb-1" />
      <div className="dash-orb dash-orb-2" />

      {/* Header */}
      <header className="admin-welcome">
        <div className="admin-welcome-text">
          <h1>Command Center</h1>
          <p>Real-time platform metrics and management.</p>
        </div>
        {stats.pendingApprovals > 0 && (
          <div className="dash-alert-pill" onClick={() => navigate('/admin/writer-requests')}>
            <span className="dash-pulse-dot" />
            {stats.pendingApprovals} pending approval{stats.pendingApprovals > 1 ? 's' : ''}
          </div>
        )}
      </header>

      {/* ── Stat Cards ── */}
      <div className="admin-stats-container">
        <StatCard label="Total Users"        value={stats.totalUsers}       icon="👥" colorClass="blue"   delay={0}   onClick={() => navigate('/admin/manage-users')} />
        <StatCard label="Verified Writers"   value={stats.totalWriters}     icon="✍️" colorClass="purple" delay={80}  onClick={() => navigate('/admin/manage-users')} />
        <StatCard label="Pending Approval"   value={stats.pendingApprovals} icon="⏳" colorClass="amber"  delay={160} onClick={() => navigate('/admin/writer-requests')} />
        <StatCard label="Total Publications" value={stats.totalWorks}       icon="📚" colorClass="teal"   delay={240} onClick={() => navigate('/admin/global-content')} />
      </div>

      {/* ── Second row: ratio bar + content split ── */}
      <div className="dash-row-2">

        {/* Writer Conversion */}
        <div className="dash-ratio-card">
          <div className="dash-ratio-header">
            <span className="dash-ratio-label">Writer Conversion Rate</span>
            <span className="dash-ratio-pct">{writerPct}%</span>
          </div>
          <div className="dash-ratio-track">
            <div className="dash-ratio-fill" style={{ width: `${writerPct}%` }} />
          </div>
          <p className="dash-ratio-sub">{stats.totalWriters} writers out of {stats.totalUsers} total users</p>
        </div>

        {/* Content Breakdown */}
        <div className="dash-ratio-card dash-content-split">
          <div className="dash-ratio-header">
            <span className="dash-ratio-label">Content Breakdown</span>
            <span className="dash-ratio-pct">{content.novels + content.articles} total</span>
          </div>
          <div className="dash-split-bars">
            <div className="dash-split-row">
              <span className="dash-split-icon">📖</span>
              <span className="dash-split-name">Stories</span>
              <div className="dash-split-track">
                <div className="dash-split-fill novel-fill" style={{ width: `${novelPct}%` }} />
              </div>
              <span className="dash-split-count">{content.novels}</span>
            </div>
            <div className="dash-split-row">
              <span className="dash-split-icon">📰</span>
              <span className="dash-split-name">Articles</span>
              <div className="dash-split-track">
                <div className="dash-split-fill article-fill" style={{ width: `${articlePct}%` }} />
              </div>
              <span className="dash-split-count">{content.articles}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Third row: recent requests + platform status ── */}
      <div className="dash-row-3">

        {/* Recent Pending Requests */}
        <div className="dash-widget">
          <div className="dash-widget-header">
            <span className="dash-widget-title">🔔 Pending Writer Requests</span>
            <button className="dash-widget-link" onClick={() => navigate('/admin/writer-requests')}>
              View all →
            </button>
          </div>
          {pending.length === 0 ? (
            <div className="dash-empty-state">
              <span className="dash-empty-icon">✅</span>
              <p>No pending requests — all clear!</p>
            </div>
          ) : (
            <ul className="dash-req-feed">
              {pending.map((req, i) => (
                <li key={req._id} className="dash-req-item" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="dash-req-avatar">{req.username.charAt(0).toUpperCase()}</div>
                  <div className="dash-req-body">
                    <p className="dash-req-name">{req.username}</p>
                    <p className="dash-req-reason">{req.reason}</p>
                    <span className="dash-req-time">{timeAgo(req.createdAt)}</span>
                  </div>
                  <div className="dash-req-btns">
                    <button className="dash-approve" onClick={() => handleQuickAction(req.userId, req._id, 'approve')} title="Approve">✓</button>
                    <button className="dash-reject"  onClick={() => handleQuickAction(req.userId, req._id, 'reject')}  title="Reject">✕</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Platform Status */}
        <div className="dash-widget">
          <div className="dash-widget-header">
            <span className="dash-widget-title">🛡️ Platform Status</span>
            <span className="dash-status-all-ok">All systems operational</span>
          </div>
          <ul className="dash-status-list">
            {[
              { label: 'API Server',      ok: true,  detail: 'Running on port 5000' },
              { label: 'MongoDB',         ok: true,  detail: 'Connected · librarydb' },
              { label: 'User Accounts',   ok: stats.totalUsers > 0,   detail: `${stats.totalUsers} registered` },
              { label: 'Content Library', ok: stats.totalWorks > 0,   detail: `${stats.totalWorks} published` },
              { label: 'Writer Program',  ok: stats.totalWriters > 0, detail: `${stats.totalWriters} active writers` },
            ].map(({ label, ok, detail }) => (
              <li key={label} className="dash-status-item">
                <span className={`dash-status-dot ${ok ? 'ok' : 'warn'}`} />
                <span className="dash-status-label">{label}</span>
                <span className="dash-status-detail">{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
};

export default AdminMainStats;