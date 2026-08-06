import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import WriterWelcome from './WriterWelcome';
import './WriterDashboard.css';

import { API_BASE_URL as API } from '../config';
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

// Animates a number counting up from 0 to `target` — used on the stat cards.
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

// SVG geometry for the "Performance Overview" trend chart
const CHART_WIDTH = 720;
const CHART_HEIGHT = 260;
const CHART_PAD = { top: 16, right: 16, bottom: 32, left: 36 };
const CHART_SERIES = [
  { key: 'likes',    label: 'Likes',           color: '#ef4444' },
  { key: 'works',    label: 'Works Published', color: '#22c55e' },
  { key: 'comments', label: 'Comments',        color: '#8b5cf6' },
];

const formatMonthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' });
};

// Buckets a writer's works into the last 6 calendar months for the chart
const buildMonthlyDataset = (works) => {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: formatMonthLabel(key), works: 0, likes: 0, comments: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  works.forEach((w) => {
    const d = new Date(w.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = byKey.get(key);
    if (!bucket) return;
    bucket.works += 1;
    bucket.likes += w.likes?.length || 0;
    bucket.comments += w.comments?.length || 0;
  });
  return months;
};

// Pure geometry builder — turns the monthly rows into SVG points/paths/ticks
const buildChartGeometry = (dataset) => {
  const innerWidth = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const innerHeight = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const maxVal = Math.max(1, ...dataset.flatMap((d) => CHART_SERIES.map((s) => d[s.key])));

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
  const primaryPts = points.likes;
  if (primaryPts && primaryPts.length) {
    const baseline = CHART_PAD.top + innerHeight;
    areaPath = `M${primaryPts[0].x},${baseline} ` +
      primaryPts.map((p) => `L${p.x},${p.y}`).join(' ') +
      ` L${primaryPts[primaryPts.length - 1].x},${baseline} Z`;
  }

  const yTicks = [0, 0.5, 1].map((f) => ({
    y: CHART_PAD.top + innerHeight - f * innerHeight,
    value: Math.round(f * maxVal),
  }));

  const xLabels = dataset.map((d, i) => ({ x: xFor(i), label: d.label, i }));
  const stepX = dataset.length > 1 ? innerWidth / (dataset.length - 1) : innerWidth;

  return { points, linePaths, areaPath, yTicks, xLabels, stepX };
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
      await axios.put(`${API}/api/users/update-welcome/${user._id || user.id}`, {}, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
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
      const authHeaders = { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } };
      const [novelsRes, articlesRes, notifRes] = await Promise.all([
        axios.get(`${API}/api/novels/author/${user._id}`, authHeaders),
        axios.get(`${API}/api/articles/author/${user._id}`, authHeaders),
        axios.get(`${API}/api/notifications/${user._id}`, authHeaders),
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

  // Stats
  const totalLikes    = works.reduce((s, w) => s + (w.likes?.length || 0), 0);
  const totalComments = works.reduce((s, w) => s + (w.comments?.length || 0), 0);
  const totalViews    = works.reduce((s, w) => s + (w.views || 0), 0);
  const publishedCount = works.filter(w => w.status === 'published').length;
  const draftCount     = works.filter(w => w.status === 'draft').length;

  // Animated counters (must run every render — no early return above these hooks)
  const animatedTotalWorks = useCountUp(works.length);
  const animatedPublished  = useCountUp(publishedCount);
  const animatedDrafts     = useCountUp(draftCount);
  const animatedLikes      = useCountUp(totalLikes);
  const animatedComments   = useCountUp(totalComments);
  const animatedViews      = useCountUp(totalViews);

  const stats = [
    { icon: '📚', label: 'Total Works',  value: animatedTotalWorks, accent: '#3b82f6' },
    { icon: '📢', label: 'Published',    value: animatedPublished,  accent: '#22c55e' },
    { icon: '📝', label: 'Drafts',       value: animatedDrafts,      accent: '#f59e0b' },
    { icon: '❤️', label: 'Total Likes',  value: animatedLikes,      accent: '#ef4444' },
    { icon: '💬', label: 'Comments',     value: animatedComments,   accent: '#8b5cf6' },
    { icon: '👁️', label: 'Total Views',  value: animatedViews,      accent: '#06b6d4' },
  ];

  // Performance chart data + draw animation
  const monthlyDataset = buildMonthlyDataset(works);
  const chartGeometry = buildChartGeometry(monthlyDataset);
  const datasetKey = monthlyDataset.map((d) => `${d.key}:${d.works}:${d.likes}:${d.comments}`).join('|');
  const hasChartActivity = monthlyDataset.some((d) => d.works || d.likes || d.comments);

  const svgRef = useRef(null);
  const likesPathRef = useRef(null);
  const worksPathRef = useRef(null);
  const commentsPathRef = useRef(null);
  const seriesPathRefs = { likes: likesPathRef, works: worksPathRef, comments: commentsPathRef };
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // "Draw" each trend line from 0% to 100% length whenever the underlying data changes
  useEffect(() => {
    if (monthlyDataset.length === 0) return;
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
    if (!svgRef.current || monthlyDataset.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    let idx = chartGeometry.stepX > 0
      ? Math.round((relX - CHART_PAD.left) / chartGeometry.stepX)
      : 0;
    idx = Math.min(Math.max(idx, 0), monthlyDataset.length - 1);
    setHoveredIndex(idx);
  };

  const handleChartMouseLeave = () => setHoveredIndex(null);

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
            <span className="wd-btn-icon">📖</span> New Story
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
              <span className="wd-stat-value">{s.value.toLocaleString()}</span>
              <span className="wd-stat-label">{s.label}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Performance Chart ── */}
      <section className="wd-card wd-chart-card wd-full-width" style={{ animation: 'wdFadeUp 0.5s ease 0.1s both' }}>
        <div className="wd-chart-header">
          <div>
            <h2>Performance Overview</h2>
            <p className="wd-chart-subtitle">Your works, likes, and comments over the last 6 months.</p>
          </div>
          <div className="wd-chart-legend">
            {CHART_SERIES.map((s) => (
              <span key={s.key} className="wd-legend-chip">
                <span className="wd-legend-dot" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="wd-loading">
            <div className="wd-spinner" />
            <p>Loading performance data…</p>
          </div>
        ) : !hasChartActivity ? (
          <div className="wd-empty small">
            <div className="wd-empty-icon">📈</div>
            <p>No activity yet — publish a work to start tracking your growth here.</p>
          </div>
        ) : (
          <div className="wd-chart-wrap">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="wd-chart-svg"
              preserveAspectRatio="none"
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartMouseLeave}
            >
              <defs>
                <linearGradient id="wdLikesAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
              </defs>

              {chartGeometry.yTicks.map((tick, i) => (
                <g key={i}>
                  <line x1={CHART_PAD.left} x2={CHART_WIDTH - CHART_PAD.right} y1={tick.y} y2={tick.y} className="wd-chart-gridline" />
                  <text x={CHART_PAD.left - 8} y={tick.y + 4} className="wd-chart-axis-label" textAnchor="end">{tick.value}</text>
                </g>
              ))}

              {chartGeometry.xLabels.map((lbl, i) => (
                <text key={i} x={lbl.x} y={CHART_HEIGHT - 8} className="wd-chart-axis-label" textAnchor="middle">{lbl.label}</text>
              ))}

              <path d={chartGeometry.areaPath} fill="url(#wdLikesAreaFill)" className="wd-chart-area" />

              {hoveredIndex !== null && chartGeometry.points.likes[hoveredIndex] && (
                <line
                  x1={chartGeometry.points.likes[hoveredIndex].x}
                  x2={chartGeometry.points.likes[hoveredIndex].x}
                  y1={CHART_PAD.top}
                  y2={CHART_HEIGHT - CHART_PAD.bottom}
                  className="wd-chart-hover-line"
                />
              )}

              {CHART_SERIES.map((s) => (
                <path
                  key={s.key}
                  ref={seriesPathRefs[s.key]}
                  d={chartGeometry.linePaths[s.key]}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="wd-chart-line"
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
                      fill={s.color}
                      className="wd-chart-dot"
                    />
                  ))}
                </g>
              ))}
            </svg>

            {hoveredIndex !== null && monthlyDataset[hoveredIndex] && (
              <div
                className="wd-chart-tooltip"
                style={{
                  left: `${(chartGeometry.points.likes[hoveredIndex].x / CHART_WIDTH) * 100}%`,
                  top: `${(chartGeometry.points.likes[hoveredIndex].y / CHART_HEIGHT) * 100}%`,
                }}
              >
                <strong>{monthlyDataset[hoveredIndex].label}</strong>
                {CHART_SERIES.map((s) => (
                  <div key={s.key} className="wd-chart-tooltip-row">
                    <span className="wd-legend-dot" style={{ background: s.color }} />
                    {monthlyDataset[hoveredIndex][s.key]} {s.label.toLowerCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Works Performance (per-work likes/comments breakdown) ── */}
      <section className="wd-card wd-full-width">
        <div className="wd-card-header">
          <h2>Works Performance</h2>
          <Link to="/writer-dashboard/works" className="wd-see-all">View All →</Link>
        </div>

        {works.length === 0 ? (
          <div className="wd-empty small">
            <p>Publish a work to see its likes and comments here.</p>
          </div>
        ) : (
          <div className="wd-table-wrap">
            <table className="wd-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Likes</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {[...works]
                  .sort((a, b) => ((b.likes?.length || 0) + (b.comments?.length || 0)) - ((a.likes?.length || 0) + (a.comments?.length || 0)))
                  .slice(0, 6)
                  .map((work) => (
                    <tr key={work._id}>
                      <td className="wd-td-title">
                        {work.status === 'published' ? (
                          <Link to={`/read/${work.workType}/${work._id}`} className="wd-title-link">
                            {work.title}
                          </Link>
                        ) : (
                          <span className="wd-title-link">{work.title}</span>
                        )}
                      </td>
                      <td>
                        <span className={`wd-type-tag ${work.workType}`}>
                          {work.workType === 'novel' ? '📖 story' : '📝 article'}
                        </span>
                      </td>
                      <td className="wd-td-num">❤️ {work.likes?.length || 0}</td>
                      <td className="wd-td-num">💬 {work.comments?.length || 0}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Recent Activity ── */}
      <aside className="wd-card wd-activity wd-full-width">
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
