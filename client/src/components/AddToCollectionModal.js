import React, { useState, useEffect } from 'react';

import { API_BASE_URL } from '../config';
const AddToCollectionModal = ({ item, userId, onClose }) => {
  const [collections, setCollections] = useState([]);

  // Fetch user's collections to display in the list
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/collections/${userId}`)
      .then(res => res.json())
      .then(data => setCollections(data))
      .catch(err => console.error(err));
  }, [userId]);

  const handleSave = (collectionId) => {
    fetch(`${API_BASE_URL}/api/collections/${collectionId}/add-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item._id, // The ID of the current novel/article
        title: item.title,
        type: item.type, // 'novel' or 'article'
        author: item.author
      })
    })
    .then(async (res) => {
      const data = await res.json();
      if (res.ok) {
        alert("Saved to collection!");
        onClose(); // Close modal on success
      } else {
        alert(data.message || "Failed to save.");
      }
    })
    .catch(err => console.error("Save error:", err));
  };

  return (
    <div className="modal-overlay">
      <div className="collection-modal">
        <h3>Save to Collection</h3>
        {collections.map(col => (
          <button key={col._id} onClick={() => handleSave(col._id)}>
            {col.icon} {col.name}
          </button>
        ))}
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

export default AddToCollectionModal;