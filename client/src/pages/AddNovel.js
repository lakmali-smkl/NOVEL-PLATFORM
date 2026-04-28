import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './writerForms.css'; 

const AddNovel = ({ user }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    authorName: user?.username || '',
    authorSpeech: ''
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

    const data = new FormData();
    data.append('title', formData.title);
    data.append('content', formData.content);
    data.append('authorName', formData.authorName);
    data.append('authorSpeech', formData.authorSpeech);
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

        <button type="submit" className="submit-btn">Publish Novel</button>
      </form>
    </div>
  );
};

export default AddNovel;