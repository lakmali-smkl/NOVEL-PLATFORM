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

  if (loading) return <div className="loading-text" style={{ color: '#fff', textAlign: 'center', marginTop: '2rem' }}>Loading collection items...</div>;

  if (!collection) return <div className="error-text" style={{ color: '#fff', textAlign: 'center', marginTop: '2rem' }}>Collection not found.</div>;

  return (
    <div className="collection-detail-container" style={{ padding: '20px', color: '#fff' }}>
      
      {/* 📁 Header Row */}
      <div className="collection-detail-header" style={{ marginBottom: '30px' }}>
        <Link to="/dashboard/read-later" className="back-link" style={{ color: '#3b82f6', textDecoration: 'none' }}>
          &larr; Back to Collections
        </Link>
        <h1 style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>{collection.icon || '📁'}</span> {collection.name}
        </h1>
        <p style={{ color: '#aaa' }}>{collection.savedItems?.length || 0} items stored in this folder</p>
      </div>

      <hr style={{ borderColor: '#333', marginBottom: '20px' }} />

      {/* 📚 Render Saved Items list from MongoDB */}
      <div className="saved-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {!collection.savedItems || collection.savedItems.length === 0 ? (
          <div className="empty-collection-state" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>This collection is empty. Go to a novel or article page to add items here!</p>
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