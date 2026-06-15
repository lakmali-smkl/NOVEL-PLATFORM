import React, { useEffect, useState } from 'react';
import './SiteGrowth.css';

const SiteGrowth = () => {
  const [growth, setGrowth] = useState({ users: [], novels: [], articles: [] });
  const [announcements, setAnnouncements] = useState([]);
  
  // Announcement Form State
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: 'info', expiresAt: '' });
  const [announcementMsg, setAnnouncementMsg] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BASE_URL = 'http://localhost:5000/api/admin';

  // Fetch all administrative metrics and records concurrently
  const loadDashboardData = async () => {
    try {
      const [growthRes, announcementsRes] = await Promise.all([
        fetch(`${BASE_URL}/growth`),
        fetch('http://localhost:5000/api/announcements') // Matches root public endpoint
      ]);

      if (!growthRes.ok || !announcementsRes.ok) {
        throw new Error('One or more systemic endpoints failed to respond properly.');
      }

      const growthData = await growthRes.json();
      const announcementsData = await announcementsRes.json();

      setGrowth({
        users: growthData.users || [],
        novels: growthData.novels || [],
        articles: growthData.articles || []
      });
      setAnnouncements(announcementsData || []);
    } catch (err) {
      console.error('Admin panel loading issue:', err);
      setError(err.message || 'Failed to assemble administrative views.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handler: Publish an Announcement asset to the ecosystem
  const handlePublishAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.message) return;

    try {
      const response = await fetch(`${BASE_URL}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAnnouncement)
      });

      if (!response.ok) throw new Error('Failed to broadcast target announcement node.');

      setAnnouncementMsg('🎉 Announcement dispatched live successfully!');
      setNewAnnouncement({ title: '', message: '', type: 'info', expiresAt: '' });
      
      // Refresh lists to display newly added asset at the top
      const freshAnnouncements = await fetch('http://localhost:5000/api/announcements');
      if (freshAnnouncements.ok) setAnnouncements(await freshAnnouncements.json());

      setTimeout(() => setAnnouncementMsg(''), 4000);
    } catch (err) {
      setAnnouncementMsg(`⚠️ Error: ${err.message}`);
    }
  };

  const buildDataset = () => {
    const allKeys = new Set();
    growth.users.forEach(item => allKeys.add(item._id));
    growth.novels.forEach(item => allKeys.add(item._id));
    growth.articles.forEach(item => allKeys.add(item._id));

    return Array.from(allKeys)
      .sort()
      .filter(date => date && date.trim() !== '')
      .map(date => ({
        date,
        users: growth.users.find(item => item._id === date)?.count || 0,
        novels: growth.novels.find(item => item._id === date)?.count || 0,
        articles: growth.articles.find(item => item._id === date)?.count || 0,
      }));
  };

  const dataset = buildDataset();
  const totalUsers = growth.users.reduce((sum, item) => sum + item.count, 0);
  const totalNovels = growth.novels.reduce((sum, item) => sum + item.count, 0);
  const totalArticles = growth.articles.reduce((sum, item) => sum + item.count, 0);

  if (loading) return <div className="growth-loading">Loading site growth analytics...</div>;
  if (error) return <div className="growth-error">⚠️ {error}</div>;

  return (
    <div className="growth-workspace">
      <div className="growth-header">
        <h2>Administrative Hub & Growth Control</h2>
        <p>Monitor trends, approve authors, and broadcast system announcements platform-wide.</p>
      </div>

      {/* 📊 SECTION 1: GROWTH METRIC SUMMARY CARDS */}
      <div className="growth-metrics-grid">
        <div className="growth-card blue">
          <span>New Registrations (30d)</span>
          <strong>{totalUsers}</strong>
        </div>
        <div className="growth-card gold">
          <span>Novels Authored (30d)</span>
          <strong>{totalNovels}</strong>
        </div>
        <div className="growth-card green">
          <span>Articles Published (30d)</span>
          <strong>{totalArticles}</strong>
        </div>
      </div>

      {/* � SECTION 2: SYSTEM ANNOUNCEMENT BROADCASTER */}
      <section className="dashboard-section grid-two-columns">
        <div className="announcement-form-box">
          <h3>Broadcast New System Announcement</h3>
          <form onSubmit={handlePublishAnnouncement} className="admin-form">
            <div className="form-group">
              <label>Header Title</label>
              <input 
                type="text" 
                placeholder="Maintenance update, writing contests, etc..."
                value={newAnnouncement.title}
                onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Classification Type</label>
              <select 
                value={newAnnouncement.type} 
                onChange={e => setNewAnnouncement({...newAnnouncement, type: e.target.value})}
              >
                <option value="info">💡 Information (Blue)</option>
                <option value="warning">⚠️ Warning Alert (Yellow)</option>
                <option value="important">🚨 Critical/Urgent (Red)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Message Content</label>
              <textarea 
                rows="4"
                placeholder="Write message copy here..."
                value={newAnnouncement.message}
                onChange={e => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Expires On</label>
              <input
                type="date"
                value={newAnnouncement.expiresAt}
                onChange={e => setNewAnnouncement({...newAnnouncement, expiresAt: e.target.value})}
              />
              <small style={{ color: '#94a3b8' }}>
                Leave blank for default 7-day expiration, or choose a custom date.
              </small>
            </div>
            <div className="form-submit-row">
              <button type="submit" className="btn-submit-broadcast">Publish System Broadcast</button>
            </div>
            {announcementMsg && <p className="form-feedback">{announcementMsg}</p>}
          </form>
        </div>

        <div className="announcement-preview-box">
          <h3>Recent Dispatched Bulletins</h3>
          <div className="announcements-history">
            {announcements.length === 0 ? (
              <p className="empty-notice">No system announcements have been recorded.</p>
            ) : (
              announcements.map((bulletin) => (
                <div key={bulletin._id} className={`bulletin-item border-${bulletin.type}`}>
                  <div className="bulletin-header">
                    <h5>{bulletin.title}</h5>
                    <span className={`tag-${bulletin.type}`}>{bulletin.type}</span>
                  </div>
                  <p>{bulletin.message}</p>
                  <small>
                    Posted: {new Date(bulletin.createdAt).toLocaleString()}
                    {bulletin.expiresAt ? ` · Expires: ${new Date(bulletin.expiresAt).toLocaleDateString()}` : ''}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 📊 SECTION 4: TIME MATRIX OVERVIEW INDEX */}
      <section className="growth-table-section">
        <h3>Daily Growth Timeline Data Matrix</h3>
        <div className="growth-table-wrapper">
          <div className="growth-table-row growth-table-header">
            <span>Date String</span>
            <span>Users Signed</span>
            <span>Novels Logged</span>
            <span>Articles Stamped</span>
          </div>
          {dataset.length === 0 ? (
            <div className="growth-table-row empty-row">No chronological registry assets logged yet.</div>
          ) : (
            dataset.map((row) => (
              <div key={row.date} className="growth-table-row">
                <span className="font-mono">{row.date}</span>
                <span>{row.users}</span>
                <span>{row.novels}</span>
                <span>{row.articles}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default SiteGrowth;