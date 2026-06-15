import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './CollectionDetail.css'; 

const CollectionDetail = () => {
  const { collectionId } = useParams();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);

  // 📥 LOAD: Fetch single collection folder details from MongoDB matching the _id
  useEffect(() => {
    fetch(`http://localhost:5000/api/collections/single/${collectionId}`)
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
              style={{ 
                background: '#1e1e1e', 
                padding: '15px', 
                borderRadius: '8px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                border: '1px solid #333'
              }}
            >
              <div className="item-info">
                <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{item.title}</h3>
                <p style={{ margin: '0', color: '#888', fontSize: '14px' }}>
                  By: {item.author || 'Unknown Author'} | <span style={{ textTransform: 'capitalize', color: '#3b82f6' }}>{item.type}</span>
                </p>
              </div>

              {/* 📖 Dynamic Link back to the ReadPage layout component */}
              <Link 
                to={`/read/${item.type}/${item._id}`} 
                className="read-now-btn"
                style={{
                  background: '#3b82f6',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: '5px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Read Now &rarr;
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CollectionDetail;