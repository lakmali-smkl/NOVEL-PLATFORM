import React, { useEffect, useRef, useState } from 'react';
import './SiteGrowth.css';

import { API_BASE_URL } from '../config';
// Animates a number counting up from 0 to `target` — used on the summary cards.
const useCountUp = (target, duration = 1200) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime = null;
    let frameId;

    const step = (timestamp) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return value;
};

// SVG geometry for the growth trend chart
const CHART_WIDTH = 760;
const CHART_HEIGHT = 280;
const CHART_PAD = { top: 16, right: 16, bottom: 32, left: 40 };
const CHART_SERIES = [
  { key: 'users', label: 'Users', colorVar: '--neon-blue' },
  { key: 'novels', label: 'Stories', colorVar: '--neon-gold' },
  { key: 'articles', label: 'Articles', colorVar: '--neon-green' },
];

const formatShortDate = (dateStr) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Pure geometry builder — turns the {date, users, novels, articles} rows
// into SVG point coordinates, line paths, an area fill, and axis ticks.
const buildChartGeometry = (dataset) => {
  const innerWidth = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const innerHeight = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const maxVal = Math.max(1, ...dataset.flatMap((d) => [d.users, d.novels, d.articles]));

  const xFor = (i) => (dataset.length <= 1
    ? CHART_PAD.left + innerWidth / 2
    : CHART_PAD.left + (i / (dataset.length - 1)) * innerWidth);
  const yFor = (v) => CHART_PAD.top + innerHeight - (v / maxVal) * innerHeight;

  const points = {};
  CHART_SERIES.forEach(({ key }) => {
    points[key] = dataset.map((d, i) => ({ x: xFor(i), y: yFor(d[key]) }));
  });

  const linePaths = {};
  CHART_SERIES.forEach(({ key }) => {
    linePaths[key] = points[key].map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  });

  let areaPath = '';
  const usersPts = points.users;
  if (usersPts && usersPts.length) {
    const baseline = CHART_PAD.top + innerHeight;
    areaPath = `M${usersPts[0].x},${baseline} ` +
      usersPts.map((p) => `L${p.x},${p.y}`).join(' ') +
      ` L${usersPts[usersPts.length - 1].x},${baseline} Z`;
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: CHART_PAD.top + innerHeight - f * innerHeight,
    value: Math.round(f * maxVal)
  }));

  const labelEvery = Math.max(1, Math.ceil(dataset.length / 6));
  const xLabels = dataset
    .map((d, i) => ({ x: xFor(i), label: formatShortDate(d.date), i }))
    .filter(({ i }) => i % labelEvery === 0 || i === dataset.length - 1);

  const stepX = dataset.length > 1 ? innerWidth / (dataset.length - 1) : innerWidth;

  return { points, linePaths, areaPath, yTicks, xLabels, stepX };
};

const SiteGrowth = () => {
  const [growth, setGrowth] = useState({ users: [], novels: [], articles: [] });
  const [announcements, setAnnouncements] = useState([]);
  
  // Announcement Form State
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: 'info', expiresAt: '' });
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BASE_URL = `${API_BASE_URL}/api/admin`;

  useEffect(() => {
    // Fetch all administrative metrics and records concurrently
    const loadDashboardData = async () => {
      try {
        const [growthRes, announcementsRes] = await Promise.all([
          fetch(`${BASE_URL}/growth`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }),
          fetch(`${BASE_URL}/announcements`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          })
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

    loadDashboardData();
  }, [BASE_URL]);

  // Refetch the admin bulletin list (used after create/update/delete)
  const refreshAnnouncements = async () => {
    const res = await fetch(`${BASE_URL}/announcements`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) setAnnouncements(await res.json());
  };

  // Handler: Publish (or update, when editing) an Announcement asset
  const handlePublishAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.title || !newAnnouncement.message) return;

    const isEditing = !!editingId;
    const url = isEditing ? `${BASE_URL}/announcements/${editingId}` : `${BASE_URL}/announcements`;

    try {
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newAnnouncement)
      });

      if (!response.ok) throw new Error(isEditing ? 'Failed to update target announcement node.' : 'Failed to broadcast target announcement node.');

      setAnnouncementMsg(isEditing ? '✅ Announcement updated successfully!' : '🎉 Announcement dispatched live successfully!');
      setNewAnnouncement({ title: '', message: '', type: 'info', expiresAt: '' });
      setEditingId(null);

      await refreshAnnouncements();

      setTimeout(() => setAnnouncementMsg(''), 4000);
    } catch (err) {
      setAnnouncementMsg(`⚠️ Error: ${err.message}`);
    }
  };

  // Populate the form with an existing bulletin's data for editing
  const handleEditClick = (bulletin) => {
    setEditingId(bulletin._id);
    setNewAnnouncement({
      title: bulletin.title,
      message: bulletin.message,
      type: bulletin.type,
      expiresAt: bulletin.expiresAt ? new Date(bulletin.expiresAt).toISOString().slice(0, 10) : ''
    });
    setAnnouncementMsg('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewAnnouncement({ title: '', message: '', type: 'info', expiresAt: '' });
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Permanently delete this announcement?')) return;
    try {
      const res = await fetch(`${BASE_URL}/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to delete announcement');
      setAnnouncements(prev => prev.filter(a => a._id !== id));
      if (editingId === id) handleCancelEdit();
    } catch (err) {
      console.error('Delete announcement error:', err);
      alert('Failed to delete announcement. Please try again.');
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

  // Animated summary counters (must run every render — no early return above these hooks)
  const animatedUsers = useCountUp(totalUsers);
  const animatedNovels = useCountUp(totalNovels);
  const animatedArticles = useCountUp(totalArticles);

  const chartGeometry = buildChartGeometry(dataset);
  const datasetKey = dataset.map((d) => `${d.date}:${d.users}:${d.novels}:${d.articles}`).join('|');

  const svgRef = useRef(null);
  const usersPathRef = useRef(null);
  const novelsPathRef = useRef(null);
  const articlesPathRef = useRef(null);
  const seriesPathRefs = { users: usersPathRef, novels: novelsPathRef, articles: articlesPathRef };

  const [hoveredIndex, setHoveredIndex] = useState(null);

  // "Draw" each trend line from 0% to 100% length whenever the underlying data changes
  useEffect(() => {
    if (dataset.length === 0) return;
    CHART_SERIES.forEach(({ key }, i) => {
      const el = seriesPathRefs[key].current;
      if (!el) return;
      const length = el.getTotalLength();
      el.style.transition = 'none';
      el.style.strokeDasharray = `${length}`;
      el.style.strokeDashoffset = `${length}`;
      el.getBoundingClientRect(); // force reflow so the reset above is registered first
      el.style.transition = `stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.15}s`;
      el.style.strokeDashoffset = '0';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetKey]);

  const handleChartMouseMove = (e) => {
    if (!svgRef.current || dataset.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    let idx = chartGeometry.stepX > 0
      ? Math.round((relX - CHART_PAD.left) / chartGeometry.stepX)
      : 0;
    idx = Math.min(Math.max(idx, 0), dataset.length - 1);
    setHoveredIndex(idx);
  };

  const handleChartMouseLeave = () => setHoveredIndex(null);

  if (loading) return <div className="growth-loading">Loading site growth analytics...</div>;
  if (error) return <div className="growth-error">⚠️ {error}</div>;

  return (
    <div className="growth-workspace">
      <div className="growth-header growth-card-anim">
        <h2>Administrative Hub & Growth Control</h2>
        <p>Monitor trends, approve authors, and broadcast system announcements platform-wide.</p>
      </div>

      {/* 📊 SECTION 1: GROWTH METRIC SUMMARY CARDS */}
      <div className="growth-metrics-grid">
        <div className="growth-card blue growth-card-anim" style={{ animationDelay: '0s' }}>
          <span>New Registrations (30d)</span>
          <strong>{animatedUsers}</strong>
        </div>
        <div className="growth-card gold growth-card-anim" style={{ animationDelay: '0.08s' }}>
          <span>Stories Authored (30d)</span>
          <strong>{animatedNovels}</strong>
        </div>
        <div className="growth-card green growth-card-anim" style={{ animationDelay: '0.16s' }}>
          <span>Articles Published (30d)</span>
          <strong>{animatedArticles}</strong>
        </div>
      </div>

      {/* 📈 SECTION 1B: VISUAL GROWTH TREND CHART */}
      <section className="dashboard-section growth-chart-section growth-card-anim" style={{ animationDelay: '0.22s' }}>
        <div className="growth-chart-header">
          <div>
            <h3>Platform Growth Trend</h3>
            <p className="growth-chart-subtitle">Daily new users, stories, and articles over the tracked period.</p>
          </div>
          <div className="growth-chart-legend">
            {CHART_SERIES.map((s) => (
              <span key={s.key} className="legend-chip">
                <span className="legend-dot" style={{ background: `var(${s.colorVar})` }}></span>
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {dataset.length === 0 ? (
          <p className="empty-notice">No chronological registry assets logged yet — the chart will populate as activity comes in.</p>
        ) : (
          <div className="growth-chart-wrap">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="growth-chart-svg"
              preserveAspectRatio="none"
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartMouseLeave}
            >
              <defs>
                <linearGradient id="usersAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--neon-blue)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--neon-blue)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {chartGeometry.yTicks.map((tick, i) => (
                <g key={i}>
                  <line x1={CHART_PAD.left} x2={CHART_WIDTH - CHART_PAD.right} y1={tick.y} y2={tick.y} className="chart-gridline" />
                  <text x={CHART_PAD.left - 8} y={tick.y + 4} className="chart-axis-label" textAnchor="end">{tick.value}</text>
                </g>
              ))}

              {chartGeometry.xLabels.map((lbl, i) => (
                <text key={i} x={lbl.x} y={CHART_HEIGHT - 8} className="chart-axis-label" textAnchor="middle">{lbl.label}</text>
              ))}

              <path d={chartGeometry.areaPath} fill="url(#usersAreaFill)" className="chart-area" />

              {hoveredIndex !== null && chartGeometry.points.users[hoveredIndex] && (
                <line
                  x1={chartGeometry.points.users[hoveredIndex].x}
                  x2={chartGeometry.points.users[hoveredIndex].x}
                  y1={CHART_PAD.top}
                  y2={CHART_HEIGHT - CHART_PAD.bottom}
                  className="chart-hover-line"
                />
              )}

              {CHART_SERIES.map((s) => (
                <path
                  key={s.key}
                  ref={seriesPathRefs[s.key]}
                  d={chartGeometry.linePaths[s.key]}
                  fill="none"
                  stroke={`var(${s.colorVar})`}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="chart-line"
                />
              ))}

              {CHART_SERIES.map((s) => (
                <g key={s.key}>
                  {chartGeometry.points[s.key].map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={hoveredIndex === i ? 5 : 3}
                      fill={`var(${s.colorVar})`}
                      className="chart-dot"
                    />
                  ))}
                </g>
              ))}
            </svg>

            {hoveredIndex !== null && dataset[hoveredIndex] && (
              <div
                className="chart-tooltip"
                style={{
                  left: `${(chartGeometry.points.users[hoveredIndex].x / CHART_WIDTH) * 100}%`,
                  top: `${(chartGeometry.points.users[hoveredIndex].y / CHART_HEIGHT) * 100}%`
                }}
              >
                <strong>{formatShortDate(dataset[hoveredIndex].date)}</strong>
                {CHART_SERIES.map((s) => (
                  <div key={s.key} className="chart-tooltip-row">
                    <span className="legend-dot" style={{ background: `var(${s.colorVar})` }}></span>
                    {dataset[hoveredIndex][s.key]} {s.label.toLowerCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 📢 SECTION 2: SYSTEM ANNOUNCEMENT BROADCASTER */}
      <section className="dashboard-section grid-two-columns growth-card-anim" style={{ animationDelay: '0.28s' }}>
        <div className="announcement-form-box">
          <h3>{editingId ? 'Edit System Announcement' : 'Broadcast New System Announcement'}</h3>
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
              <button type="submit" className="btn-submit-broadcast">
                {editingId ? 'Update Broadcast' : 'Publish System Broadcast'}
              </button>
              {editingId && (
                <button type="button" className="btn-cancel-edit" onClick={handleCancelEdit}>
                  Cancel
                </button>
              )}
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
                <div key={bulletin._id} className={`bulletin-item border-${bulletin.type} ${editingId === bulletin._id ? 'bulletin-editing' : ''}`}>
                  <div className="bulletin-header">
                    <h5>{bulletin.title}</h5>
                    <span className={`tag-${bulletin.type}`}>{bulletin.type}</span>
                  </div>
                  <p>{bulletin.message}</p>
                  <div className="bulletin-footer">
                    <small>
                      Posted: {new Date(bulletin.createdAt).toLocaleString()}
                      {bulletin.expiresAt ? ` · Expires: ${new Date(bulletin.expiresAt).toLocaleDateString()}` : ''}
                    </small>
                    <div className="bulletin-actions">
                      <button
                        type="button"
                        className="bulletin-edit-btn"
                        onClick={() => handleEditClick(bulletin)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="bulletin-delete-btn"
                        onClick={() => handleDeleteAnnouncement(bulletin._id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 📊 SECTION 4: TIME MATRIX OVERVIEW INDEX */}
      <section className="growth-table-section growth-card-anim" style={{ animationDelay: '0.34s' }}>
        <h3>Daily Growth Timeline Data Matrix</h3>
        <div className="growth-table-wrapper">
          <div className="growth-table-row growth-table-header">
            <span>Date String</span>
            <span>Users Signed</span>
            <span>Stories Logged</span>
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