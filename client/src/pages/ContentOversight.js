import React, { useState, useEffect } from 'react';
import './ContentOversight.css'; // We will create this next!

const ContentOversight = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'novel', 'article'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch all works (Novels and Articles combined) from Backend
  const fetchContent = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/content', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        throw new Error(`Server status error: ${response.status}`);
      }
    } catch (err) {
      console.error("Failed to load global content registry:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  // 2. Delete Content Action Handler
  const handleDeleteContent = async (itemId, contentType) => {
    const confirmation = window.confirm(`⚠️ Are you absolutely sure you want to permanently delete this ${contentType}? This action cannot be undone.`);
    if (!confirmation) return;

    // Optimistic UI Update: filter it out immediately
    setItems(prevItems => prevItems.filter(item => item._id !== itemId));

    try {
      const res = await fetch(`http://localhost:5000/api/admin/content/${contentType}/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        alert(`Failed to remove the ${contentType} from server database.`);
        fetchContent(); // Revert back to original DB state if failed
      }
    } catch (err) {
      console.error("Content removal error exception:", err);
      alert("Network error: Could not complete content deletion.");
      fetchContent();
    }
  };

  // 3. Filtering Pipeline Engine
  const filteredItems = items.filter(item => {
    const title = item.title || '';
    const authorName = item.author?.username || '';
    
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          authorName.toLowerCase().includes(searchTerm.toLowerCase());

    if (typeFilter === 'all') return matchesSearch;
    return matchesSearch && item.contentType === typeFilter;
  });

  // Derived Metrics Analytics summary row
  const metrics = {
    total: items.length,
    novels: items.filter(i => i.contentType === 'novel').length,
    articles: items.filter(i => i.contentType === 'article').length,
  };

  if (loading) return <div className="co-loading">Loading Content Repository Assets...</div>;
  if (error) return <div className="co-error">⚠️ Connection Failure: Failed to sync backend data stream. ({error})</div>;

  return (
    <div className="co-workspace">

      {/* HEADER TITLE SUMMARY block */}
      <div className="co-header">
        <h2><span className="co-header-icon">📚</span> Content Oversight Portal</h2>
        <p className="co-subtitle">Audit, filter, and moderate global database asset uploads for novels and articles.</p>
      </div>

      {/* REFRESHING METRIC MATRIX PANELS */}
      <div className="co-metrics-grid">
        <div className="co-metric-card">
          <div className="co-metric-icon co-metric-icon-total">🗂️</div>
          <div>
            <span className="co-metric-label">Total System Content</span>
            <span className="co-metric-value">{metrics.total}</span>
          </div>
        </div>
        <div className="co-metric-card">
          <div className="co-metric-icon co-metric-icon-novels">📖</div>
          <div>
            <span className="co-metric-label">Indexed Novels</span>
            <span className="co-metric-value co-metric-value-novels">{metrics.novels}</span>
          </div>
        </div>
        <div className="co-metric-card">
          <div className="co-metric-icon co-metric-icon-articles">📰</div>
          <div>
            <span className="co-metric-label">Indexed Articles</span>
            <span className="co-metric-value co-metric-value-articles">{metrics.articles}</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROL CONTROLLER ACTION STRIP */}
      <div className="co-filter-bar">
        <div className="co-filter-label">
          <span className="co-filter-icon">⚙️</span> Filters
        </div>
        <div className="co-search-wrap">
          <span className="co-search-icon">🔎</span>
          <input
            type="text"
            className="co-search-input"
            placeholder="Search by publication title or author name asset..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="co-search-clear"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <select
          className="co-type-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Content Collections</option>
          <option value="novel">Novels Only</option>
          <option value="article">Articles Only</option>
        </select>
      </div>

      {/* GRID LAYOUT RENDER SHEET */}
      <div className="co-table-wrap">
        <table className="co-table">
          <thead>
            <tr>
              <th>Publication Document Title</th>
              <th>Content Type</th>
              <th>Creator Author</th>
              <th>Creation Date</th>
              <th className="co-text-right">Moderation Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item._id}>
                <td>
                  <div className="co-title-cell">
                    <span className="co-title-icon">{item.contentType === 'novel' ? '📖' : '📰'}</span>
                    <div className="co-title-text">
                      <span className="co-title-main">{item.title}</span>
                      <span className="co-title-sub">{item.genre || item.category || 'General'}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`co-pill co-badge-${item.contentType}`}>
                    {item.contentType.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className="co-author-tag">👤 {item.author?.username || 'Unknown Author'}</span>
                </td>
                <td className="co-date-cell">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'Historical Node'
                  }
                </td>
                <td>
                  <div className="co-action-group">
                    <button
                      className="co-delete-btn"
                      onClick={() => handleDeleteContent(item._id, item.contentType)}
                    >
                      🗑️ Delete Item
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <div className="co-table-empty">No content publications found matching your structural search queries.</div>
        )}
      </div>

    </div>
  );
};

export default ContentOversight;