import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './WriterDashboard.css';

const API = 'http://localhost:5000';

const WriterWorks = ({ user }) => {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('draft');

  const fetchData = useCallback(async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const [novelsRes, articlesRes] = await Promise.all([
        axios.get(`${API}/api/novels/author/${user._id}`),
        axios.get(`${API}/api/articles/author/${user._id}`),
      ]);
      const allWorks = [
        ...novelsRes.data.map((n) => ({ ...n, workType: 'novel' })),
        ...articlesRes.data.map((a) => ({ ...a, workType: 'article' })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setWorks(allWorks);
    } catch (err) {
      console.error('Writer works fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (work) => {
    if (!window.confirm(`Delete "${work.title}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/api/${work.workType}s/${work._id}`);
      setWorks((prev) => prev.filter((w) => w._id !== work._id));
    } catch (err) {
      console.error(err);
    }
  };

  const draftWorks = works.filter((w) => w.status === 'draft');
  const publishedWorks = works.filter((w) => w.status === 'published');
  const visibleWorks = activeTab === 'draft' ? draftWorks : publishedWorks;

  return (
    <div className="wd-page">
      <div className="wd-bg-glow wd-glow-1" />
      <div className="wd-bg-glow wd-glow-2" />

      <header className="wd-header">
        <div className="wd-header-text">
          <p className="wd-greeting">Writer Portal</p>
          <h1 className="wd-username">My Works</h1>
          <p className="wd-subtitle">All your novels and articles, organized by draft and published status.</p>
        </div>
        <div className="wd-header-actions">
          <button className="wd-create-btn primary" onClick={() => window.location.assign('/add-novel')}>
            <span className="wd-btn-icon">📖</span> New Novel
          </button>
          <button className="wd-create-btn secondary" onClick={() => window.location.assign('/add-article')}>
            <span className="wd-btn-icon">📝</span> New Article
          </button>
        </div>
      </header>

      <section className="wd-card wd-publications wd-full-width">
        <div className="wd-tabs">
          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'draft' ? 'active' : ''}`}
            onClick={() => setActiveTab('draft')}
          >
            📝 Drafts <span className="wd-tab-count">{draftWorks.length}</span>
          </button>
          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'published' ? 'active' : ''}`}
            onClick={() => setActiveTab('published')}
          >
            ✅ Published <span className="wd-tab-count">{publishedWorks.length}</span>
          </button>
        </div>

        {loading ? (
          <div className="wd-loading">
            <div className="wd-spinner" />
            <p>Loading your works…</p>
          </div>
        ) : visibleWorks.length === 0 ? (
          <div className="wd-empty">
            <div className="wd-empty-icon">{activeTab === 'draft' ? '📝' : '✅'}</div>
            <p>
              {activeTab === 'draft'
                ? "No drafts saved right now. Start writing and save as a draft to see it here."
                : "Nothing published yet. Publish a novel or article to see it here."}
            </p>
            <button className="wd-create-btn primary" onClick={() => window.location.assign('/add-novel')}>
              Create a New Work
            </button>
          </div>
        ) : (
          <div className="wd-table-wrap">
            <table className="wd-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Likes</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleWorks.map((work) => (
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
                        {work.workType === 'novel' ? '📖' : '📝'} {work.workType}
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
          </div>
        )}
      </section>
    </div>
  );
};

export default WriterWorks;
