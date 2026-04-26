import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddNovel.css';

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

    // Use FormData for file uploads
    const data = new FormData();
    data.append('title', formData.title);
    data.append('content', formData.content);
    data.append('authorName', formData.authorName);
    data.append('authorSpeech', formData.authorSpeech);
    if (coverPhoto) data.append('coverPhoto', coverPhoto);
    if (textFile) data.append('textFile', textFile);

    const response = await fetch('http://localhost:5000/api/novels', {
      method: 'POST',
      body: data // DO NOT set Content-Type header when using FormData
    });

    if (response.ok) {
      alert("Novel published successfully!");
      navigate('/admin-dashboard');
    } else {
      alert("Error saving novel.");
    }
  };

  return (
    <div className="add-novel-container">
      <h2>Add New Novel</h2>
      <form onSubmit={handleSubmit} className="novel-form">
        <div className="form-group">
          <label>Title</label>
          <input name="title" onChange={handleInputChange} required />
        </div>

        <div className="form-group">
          <label>Content (Paste below or upload .txt file)</label>
          <textarea name="content" onChange={handleInputChange} rows="10" />
          <input type="file" accept=".txt" onChange={(e) => handleFileChange(e, setTextFile)} />
        </div>

        <div className="form-group">
          <label>Cover Photo</label>
          <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setCoverPhoto)} />
        </div>

        <div className="form-group">
          <label>Author Name</label>
          <input name="authorName" value={formData.authorName} onChange={handleInputChange} />
        </div>

        <div className="form-group">
          <label>Author Speech (Bio/Notes)</label>
          <textarea name="authorSpeech" onChange={handleInputChange} />
        </div>

        <button type="submit" className="submit-btn">Publish Novel</button>
      </form>
    </div>
  );
};

export default AddNovel;