import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './writerForms.css'; // Importing the separate CSS file

const AddArticle = ({ user }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        authorName: '',
        status: 'published' // Default to published
    });
    const [coverPhoto, setCoverPhoto] = useState(null);
    const [textFile, setTextFile] = useState(null);
    const [loadingFile, setLoadingFile] = useState(false);

    const loadPdfJs = () => {
        return new Promise((resolve, reject) => {
            if (window.pdfjsLib) {
                resolve(window.pdfjsLib);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
            script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
                resolve(window.pdfjsLib);
            };
            script.onerror = (err) => reject(new Error('Failed to load PDF.js: ' + err.message));
            document.head.appendChild(script);
        });
    };

    const extractTextFromPdf = async (file) => {
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        return fullText;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setCoverPhoto(e.target.files[0]);
    };

    const handleContentFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setTextFile(file);
        setLoadingFile(true);
        try {
            let text = '';
            if (file.name.endsWith('.pdf')) {
                text = await extractTextFromPdf(file);
            } else if (file.name.endsWith('.txt')) {
                const reader = new FileReader();
                text = await new Promise((resolve, reject) => {
                    reader.onload = (event) => resolve(event.target.result);
                    reader.onerror = (error) => reject(error);
                    reader.readAsText(file);
                });
            } else {
                alert('Unsupported file type. Please select a .txt or .pdf file.');
                setLoadingFile(false);
                return;
            }
            setFormData(prev => ({ ...prev, content: text }));
        } catch (error) {
            console.error('Error reading file:', error);
            alert('Failed to extract content from the selected file.');
        } finally {
            setLoadingFile(false);
        }
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
        data.append('authorId', authorId); 
        data.append('status', formData.status);
        if (coverPhoto) {
            data.append('coverPhoto', coverPhoto);
        }
        if (textFile) {
            data.append('textFile', textFile);
        }

        try {
            const response = await fetch('http://localhost:5000/api/articles', {
                method: 'POST',
                body: data,
            });

            if (response.ok) {
                alert("Article published successfully!");
                setFormData({ title: '', content: '', authorName: '', status: 'published' });
                setCoverPhoto(null); // Clear the image too
                setTextFile(null); // Clear the text file too
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
            <button type="button" className="form-back-link" onClick={() => navigate('/writer-dashboard')}>
                ← Back to Dashboard
            </button>
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
                    <label>Content (Paste below or upload .txt/.pdf file)</label>
                    <textarea
                        className="writer-textarea"
                        name="content"
                        value={formData.content}
                        placeholder={loadingFile ? "Extracting text from file..." : "Start writing your thoughts..."}
                        onChange={handleChange}
                        disabled={loadingFile}
                        required
                    />
                    <input 
                        type="file" 
                        accept=".txt,.pdf" 
                        onChange={handleContentFileChange} 
                        disabled={loadingFile}
                    />
                    {loadingFile && <span className="loading-file-indicator" style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>Parsing file, please wait...</span>}
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

                <div className="form-group">
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

                <button type="submit" className="submit-btn">Publish Article</button>
            </form>
        </div>
    );
};

export default AddArticle;