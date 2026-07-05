import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './writerForms.css'; 

const AddNovel = ({ user }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    authorName: user?.username || '',
    authorSpeech: '',
    status: 'published', // Default to published
    genre: 'other'
  });
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [textFile, setTextFile] = useState(null);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, setFile) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const authorId = user?._id;
    if (!authorId) {
      alert("User is not logged in properly. Please refresh.");
      return;
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('content', formData.content);
    data.append('authorName', formData.authorName);
    data.append('authorSpeech', formData.authorSpeech);
    data.append('authorId', authorId);
    data.append('status', formData.status);
    data.append('genre', formData.genre);
    if (coverPhoto) data.append('coverPhoto', coverPhoto);
    if (textFile) data.append('textFile', textFile);

    try {
      const response = await fetch('http://localhost:5000/api/novels', {
        method: 'POST',
        body: data
      });

      if (response.ok) {
        alert("Novel published successfully!");
        navigate('/writer-dashboard');
      } else {
        alert("Error saving novel.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Something went wrong.");
    }
  };

  return (
    <div className="writer-form-container">
      <h2>Add New Novel</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input 
            className="writer-input" 
            name="title" 
            onChange={handleInputChange} 
            required 
          />
        </div>

        <div className="form-group">
          <label>Content (Paste below or upload .txt file)</label>
          <textarea 
            className="writer-textarea" 
            name="content" 
            onChange={handleInputChange} 
          />
          <input 
            type="file" 
            accept=".txt" 
            onChange={(e) => handleFileChange(e, setTextFile)} 
          />
        </div>

        <div className="form-group">
          <label>Cover Photo</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => handleFileChange(e, setCoverPhoto)} 
          />
        </div>

        <div className="form-group">
          <label>Author Name</label>
          <input 
            className="writer-input" 
            name="authorName" 
            value={formData.authorName} 
            onChange={handleInputChange} 
          />
        </div>

        <div className="form-group">
          <label>Author Speech (Bio/Notes)</label>
          <textarea 
            className="writer-textarea" 
            name="authorSpeech" 
            onChange={handleInputChange} 
          />
        </div>

        <div className="form-group">
          <label>Genre</label>
          <select 
            className="writer-input" 
            value={formData.genre} 
            name="genre"
            onChange={handleInputChange}
          >
            <option value="fantasy">Fantasy</option>
            <option value="romance">Romance</option>
            <option value="thriller">Thriller</option>
            <option value="mystery">Mystery</option>
            <option value="sci-fi">Sci-Fi</option>
            <option value="horror">Horror</option>
            <option value="adventure">Adventure</option>
            <option value="historical">Historical</option>
            <option value="drama">Drama</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Status</label>
          <select 
            className="writer-input" 
            value={formData.status} 
            name="status"
            onChange={handleInputChange}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <button type="submit" className="submit-btn">Publish Novel</button>
      </form>
    </div>
  );
};

export default AddNovel;