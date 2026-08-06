import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './EditNovel.css'; 

import { API_BASE_URL } from '../config';
const EditNovel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', content: '', authorSpeech: '', status: 'draft' });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    const url = user ? `${API_BASE_URL}/api/novels/${id}?userId=${user._id}` : `${API_BASE_URL}/api/novels/${id}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        // Only update state if data exists to avoid controlled/uncontrolled input errors
        if (data) {
          setFormData({
            title: data.title || '',
            content: data.content || '',
            authorSpeech: data.authorSpeech || '',
            status: data.status || 'draft'
          });
        }
      })
      .catch(err => console.error("Error fetching novel:", err));
  }, [id]);

  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return alert("Please login first!");

    try {
      const response = await fetch(`${API_BASE_URL}/api/novels/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...formData, userId: user._id })
      });

      if (response.ok) {
        alert("Story updated successfully!");
        navigate('/writer-dashboard');
      } else {
        alert("Failed to update story.");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Server connection failed.");
    }
  };

  return (
    <div className="edit-novel-container">
      <button type="button" className="form-back-link" onClick={() => navigate('/writer-dashboard')}>
        ← Back to Dashboard
      </button>
      <h1>Edit Story</h1>
      <form onSubmit={handleUpdate}>
        
        <div className="edit-form-group">
          <label>Chapter Title</label>
          <input 
            className="writer-input" 
            value={formData.title} 
            name="title"
            onChange={handleChange} 
            required
          />
        </div>

        <div className="edit-form-group">
          <label>Story Content</label>
          <textarea 
            className="edit-textarea" 
            value={formData.content} 
            name="content"
            onChange={handleChange} 
            required
          />
        </div>

        <div className="edit-form-group">
          <label>Author's Note</label>
          <textarea 
            className="writer-textarea" 
            style={{ minHeight: '100px' }}
            value={formData.authorSpeech} 
            name="authorSpeech"
            onChange={handleChange} 
          />
        </div>

        <div className="edit-form-group">
          <label>Status</label>
          <select 
            className="writer-input" 
            value={formData.status} 
            name="status"
            onChange={handleChange}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <button type="submit" className="save-changes-btn">
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditNovel;