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

  if (loading) return <div className="oversight-loading">Loading Content Repository Assets...</div>;
  if (error) return <div className="oversight-error">⚠️ Connection Failure: Failed to sync backend data stream. ({error})</div>;

  return (
    <div className="oversight-workspace">
      
      {/* HEADER TITLE SUMMARY block */}
      <div className="oversight-header">
        <h2>Content Oversight Portal</h2>
        <p className="subtitle">Audit, filter, and moderate global database asset uploads for novels and articles.</p>
      </div>

      {/* REFRESHING METRIC MATRIX PANELS */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Total System Content</span>
          <span className="metric-value">{metrics.total}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Indexed Novels</span>
          <span className="metric-value novel-count">{metrics.novels}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Indexed Articles</span>
          <span className="metric-value article-count">{metrics.articles}</span>
        </div>
      </div>

      {/* FILTER CONTROL CONTROLLER ACTION STRIP */}
      <div className="filter-action-bar">
        <input 
          type="text" 
          className="search-input"
          placeholder="Search by publication title or author name asset..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="role-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Content Collections</option>
          <option value="novel">Novels Only</option>
          <option value="article">Articles Only</option>
        </select>
      </div>

      {/* GRID LAYOUT RENDER SHEET */}
      <div className="table-responsive-wrapper">
        <table className="directory-table">
          <thead>
            <tr>
              <th>Publication Document Title</th>
              <th>Content Type</th>
              <th>Creator Author</th>
              <th>Creation Date</th>
              <th className="text-right">Moderation Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item._id}>
                <td>
                  <div className="user-info-cell">
                    <span className="cell-username">{item.title}</span>
                    <span className="cell-email">{item.genre || item.category || 'General'}</span>
                  </div>
                </td>
                <td>
                  <span className={`pill badge-${item.contentType}`}>
                    {item.contentType.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className="author-name-tag">👤 {item.author?.username || 'Unknown Author'}</span>
                </td>
                <td className="date-cell">
                  {item.createdAt 
                    ? new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'Historical Node'
                  }
                </td>
                <td>
                  <div className="action-button-group">
                    <button 
                      className="btn-table btn-revoke"
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
          <div className="table-empty">No content publications found matching your structural search queries.</div>
        )}
      </div>

    </div>
  );
};

export default ContentOversight;