import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ReadLater.css';

const ReadLater = ({ user }) => {
  const [collections, setCollections] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [loading, setLoading] = useState(true);

  // Fallback user authentication data extraction
  const localUser = JSON.parse(localStorage.getItem('user'));
  const activeUserId = user?._id || user?.id || localUser?._id || localUser?.id;

  // 📥 Fetch collections from MongoDB
  useEffect(() => {
    if (!activeUserId) {
      setLoading(false);
      return;
    }

    fetch(`http://localhost:5000/api/collections/${activeUserId}`)
      .then((res) => res.json())
      .then((data) => {
        setCollections(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading user database collections:", err);
        setLoading(false);
      });
  }, [activeUserId]);

  // 🛠️ Save a brand new collection folder document to MongoDB
  const handleAddCollection = () => {
    if (!newColName.trim()) return;
    if (!activeUserId) {
      alert("Please log in first to create a collection!");
      return;
    }

    fetch('http://localhost:5000/api/collections/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: activeUserId,
        name: newColName,
        icon: '📁'
      })
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to create folder document entry.");
        return res.json();
      })
      .then((newFolderDoc) => {
        setCollections([...collections, newFolderDoc]);
        setNewColName('');
        setShowModal(false);
      })
      .catch((err) => {
        console.error("Database save transaction aborted:", err);
        alert("Could not sync new folder data with backend database.");
      });
  };

  if (loading) {
    return (
      <div className="writer-container">
        <p style={{ color: '#fff' }}>Loading custom collections...</p>
      </div>
    );
  }

  return (
    <div className="writer-container">
      <div className="writer-header">
        <h1>My Collections</h1>
        <p>Your personalized reading lists and saved stories.</p>
      </div>

      <div className="collections-grid">
        {/* ACTION CARD: Opens Modal */}
        <div className="collection-card create-card" onClick={() => setShowModal(true)}>
          <div className="card-icon">➕</div>
          <div className="card-content">
            <h4>New Collection</h4>
            <p>Create a fresh reading folder</p>
          </div>
        </div>

        {/* DYNAMIC DATABASE LIST */}
        {collections.length === 0 ? (
          <div className="empty-state">
            <p>You haven't created any collections yet.</p>
          </div>
        ) : (
          collections.map((folder) => (
            <Link to={`/dashboard/collections/${folder._id}`} key={folder._id} className="collection-card">
              <div className="card-badge">{folder.savedItems?.length || 0} items</div>
              <div className="card-icon">{folder.icon || '📁'}</div>
              <div className="card-content">
                <h4>{folder.name}</h4>
                <p>View Collection &rarr;</p>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* QUICK ADD MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="collection-modal">
            <h3>Name your collection</h3>
            <input 
              type="text" 
              placeholder="e.g. Favorite Novels" 
              value={newColName} 
              onChange={(e) => setNewColName(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="create-btn" onClick={handleAddCollection}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadLater;