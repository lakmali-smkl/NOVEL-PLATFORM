import React, { useState , useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ReadLater.css';

const ReadLater = ({ user }) => {
  const [collections, setCollections] = useState(() => {
    const saved = localStorage.getItem(`collections_${user?._id}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showModal, setShowModal] = useState(false);
  const [newColName, setNewColName] = useState('');

  // SAVE: Every time collections change, update localStorage
  useEffect(() => {
    localStorage.setItem(`collections_${user?._id}`, JSON.stringify(collections));
  }, [collections, user]);

  const handleAddCollection = () => {
    if (!newColName.trim()) return;
    const newCollection = {
      _id: Date.now().toString(),
      name: newColName,
      items: 0,
      icon: '📁'
    };
    setCollections([...collections, newCollection]);
    setNewColName('');
    setShowModal(false);
  };

  return (
    <div className="writer-container">
      <div className="writer-header">
        <h1>My Collections</h1>
        <p>Your personalized reading lists and saved stories.</p>
      </div>

      <div className="collections-grid">
        {/* ACTION CARD: Opens Modal */}
        <div className="collection-card create-new" onClick={() => setShowModal(true)}>
          <div className="card-inner">
            <span className="plus-icon">+</span>
            <h4>New Collection</h4>
          </div>
        </div>

        {/* DYNAMIC LIST */}
        {collections.length === 0 ? (
          <div className="empty-state">
            <p>You haven't created any collections yet.</p>
          </div>
        ) : (
          collections.map((folder) => (
            <Link to={`/dashboard/collections/${folder._id}`} key={folder._id} className="collection-card">
              <div className="card-badge">{folder.items} items</div>
              <div className="card-icon">{folder.icon}</div>
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