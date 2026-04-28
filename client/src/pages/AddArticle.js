import React, { useState } from 'react';
import './writerForms.css'; // Importing the separate CSS file

const AddArticle = ({ user }) => {
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

        // 1. FIX: Define the variable first by grabbing the _id from the user prop
        const authorId = user?._id;

        // 2. NOW you can safely check if it exists
        if (!authorId) {
            alert("User is not logged in properly. Please refresh.");
            return;
        }

        const data = new FormData();
        data.append('title', formData.title);
        data.append('content', formData.content);
        data.append('authorName', formData.authorName);
        data.append('authorId', authorId); // Use the variable you defined above
        
        if (coverPhoto) {
            data.append('coverPhoto', coverPhoto);
        }

        try {
            const response = await fetch('http://localhost:5000/api/articles', {
                method: 'POST',
                body: data,
            });

            if (response.ok) {
                alert("Article published successfully!");
                // Clear the form
                setFormData({ title: '', content: '', authorName: '' });
                setCoverPhoto(null); // Clear the image too
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
        <div className="writer-form-container">
            <h2>Write New Article</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Article Title</label>
                    <input
                        className="writer-input"
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
                        className="writer-input"
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
                        className="writer-textarea"
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