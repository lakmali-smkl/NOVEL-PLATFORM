import React, { useState } from 'react';
import './AdminForms.css'; // Importing the separate CSS file

const AddArticle = () => {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        authorName: ''
    });
    const [coverPhoto, setCoverPhoto] = useState(null);

    // Handle text input changes
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle file selection
    const handleFileChange = (e) => {
        setCoverPhoto(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Use FormData for file uploads
        const data = new FormData();
        data.append('title', formData.title);
        data.append('content', formData.content);
        data.append('authorName', formData.authorName);
        if (coverPhoto) {
            data.append('coverPhoto', coverPhoto);
        }

        try {
            const response = await fetch('http://localhost:5000/api/articles', {
                method: 'POST',
                // Note: Don't set 'Content-Type' header when sending FormData; 
                // the browser will set it automatically with the boundary.
                body: data,
            });

            if (response.ok) {
                alert("Article published successfully!");
                // Optional: Clear form
                setFormData({ title: '', content: '', authorName: '' });
                e.target.reset();
            } else {
                alert("Error saving article");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            alert("Server connection failed");
        }
    };

    return (
        <div className="admin-form-container">
            <h2>Write New Article</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Article Title</label>
                    <input
                        className="admin-input"
                        name="title"
                        type="text"
                        value={formData.title}
                        placeholder="Enter a catchy title..."
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Author Name</label>
                    <input
                        className="admin-input"
                        name="authorName"
                        type="text"
                        value={formData.authorName}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Content</label>
                    <textarea
                        className="admin-textarea"
                        name="content"
                        value={formData.content}
                        placeholder="Start writing your thoughts..."
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Banner Image (Optional)</label>
                    <div className="file-input-wrapper">
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileChange} 
                        />
                    </div>
                </div>

                <button type="submit" className="submit-btn">Publish Article</button>
            </form>
        </div>
    );
};

export default AddArticle;