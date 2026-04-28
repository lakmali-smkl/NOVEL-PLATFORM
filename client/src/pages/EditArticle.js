import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './EditNovel.css'; 

const EditArticle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', content: '', authorName: '' });

  useEffect(() => {
    fetch(`http://localhost:5000/api/articles/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setFormData({
            title: data.title || '',
            content: data.content || '',
            authorName: data.authorName || ''
          });
        }
      })
      .catch(err => console.error("Error fetching article:", err));
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert("Article updated successfully!");
        navigate('/writer-dashboard');
      } else {
        alert("Failed to update article.");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("Server connection failed.");
    }
  };

  return (
    <div className="edit-novel-container"> {/* Reusing your CSS container */}
      <h1>Edit Article</h1>
      <form onSubmit={handleUpdate}>
        <div className="edit-form-group">
          <label>Article Title</label>
          <input 
            className="writer-input" 
            value={formData.title} 
            name="title"
            onChange={handleChange} 
            required
          />
        </div>

        <div className="edit-form-group">
          <label>Content</label>
          <textarea 
            className="edit-textarea" 
            value={formData.content} 
            name="content"
            onChange={handleChange} 
            required
          />
        </div>

        <button type="submit" className="save-changes-btn">
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditArticle;