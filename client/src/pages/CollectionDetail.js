import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './CollectionDetail.css';

import { API_BASE_URL } from '../config';
const CollectionDetail = () => {
  const { collectionId } = useParams();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/collections/single/${collectionId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load collection details.");
        return res.json();
      })
      .then((data) => {
        setCollection(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching collection metadata details:", err);
        setLoading(false);
      });
  }, [collectionId]);

  // ✂️ Remove a single saved item from this collection
  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('Remove this item from the collection?')) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/collections/${collectionId}/items/${itemId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }
      );
      if (!res.ok) throw new Error('Failed');
      setCollection(prev => ({
        ...prev,
        savedItems: prev.savedItems.filter(i => i._id !== itemId)
      }));
    } catch (err) {
      console.error('Remove item error:', err);
      alert('Failed to remove item. Please try again.');
    }
  };

  if (loading) return <div className="loading-text">Loading collection items...</div>;

  if (!collection) return <div className="error-text">Collection not found.</div>;

  return (
    <div className="collection-detail-container">

      {/* 📁 Header Row */}
      <div className="collection-detail-header">
        <Link to="/dashboard/read-later" className="back-link">
          &larr; Back to Collections
        </Link>
        <h1>
          <span>{collection.icon || '📁'}</span> {collection.name}
        </h1>
        <p className="collection-item-count">{collection.savedItems?.length || 0} items stored in this folder</p>
      </div>

      <hr className="collection-detail-divider" />

      {/* 📚 Render Saved Items list from MongoDB */}
      <div className="saved-items-list">
        {!collection.savedItems || collection.savedItems.length === 0 ? (
          <div className="empty-collection-state">
            <p>This collection is empty. Go to a story or article page to add items here!</p>
          </div>
        ) : (
          collection.savedItems.map((item) => (
            <div
              key={item._id}
              className="saved-item-row"
            >
              <div className="item-info">
                <h3>{item.title}</h3>
                <p>
                  By: {item.author || 'Unknown Author'} |{' '}
                  <span className="item-type-badge">{item.type}</span>
                </p>
              </div>

              <div className="item-actions">
                <Link
                  to={`/read/${item.type}/${item._id}`}
                  className="read-now-btn"
                >
                  Read Now &rarr;
                </Link>
                <button
                  className="remove-item-btn"
                  onClick={() => handleRemoveItem(item._id)}
                  title="Remove from collection"
                >
                  ✕ Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CollectionDetail;