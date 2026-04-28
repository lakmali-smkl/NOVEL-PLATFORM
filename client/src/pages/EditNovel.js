import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './EditNovel.css'; 

const EditNovel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', content: '', authorSpeech: '' });

  useEffect(() => {
    fetch(`http://localhost:5000/api/novels/${id}`)
      .then(res => res.json())
      .then(data => {
        // Only update state if data exists to avoid controlled/uncontrolled input errors
        if (data) {
          setFormData({
            title: data.title || '',
            content: data.content || '',
            authorSpeech: data.authorSpeech || ''
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
    try {
      const response = await fetch(`http://localhost:5000/api/novels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert("Novel updated successfully!");
        navigate('/writer-dashboard');
      } else {
        alert("Failed to update novel.");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Server connection failed.");
    }
  };

  return (
    <div className="edit-novel-container">
      <h1>Edit Novel</h1>
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
          <label>Novel Content</label>
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

        <button type="submit" className="save-changes-btn">
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditNovel;