import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './ReadPage.css';

const ReadPage = () => {
    const { type, id } = useParams(); 
    const [data, setData] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [commentText, setCommentText] = useState("");
    const [comments, setComments] = useState([]);

    // 📁 Collections Database States
    const [collections, setCollections] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false); // Added Loading State

    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user?._id || user?.id;

    // 📥 LOAD: Sync user collections from the MongoDB Database on load
    useEffect(() => {
        if (userId) {
            fetch(`http://localhost:5000/api/collections/${userId}`)
                .then((res) => {
                    if (!res.ok) throw new Error("Failed to pull collections");
                    return res.json();
                })
                .then((serverCollections) => {
                    if (Array.isArray(serverCollections)) {
                        setCollections(serverCollections);
                    } else {
                        setCollections([]);
                    }
                })
                .catch((err) => {
                    console.error("Error fetching collections from DB:", err);
                    setCollections([]);
                });
        }
    }, [userId]);

    // Load main content data (Novels / Articles)
    useEffect(() => {
        const url = userId
            ? `http://localhost:5000/api/${type}s/${id}?userId=${userId}`
            : `http://localhost:5000/api/${type}s/${id}`;

        fetch(url)
            .then((res) => res.json())
            .then((responseData) => {
                setData(responseData);
                setComments(responseData.comments || []);
                setLikesCount(responseData.likes?.length || 0);

                if (
                    userId &&
                    responseData.likes &&
                    responseData.likes.includes(userId)
                ) {
                    setIsLiked(true);
                }
            })
            .catch((err) => {
                console.error(err);
            });
    }, [type, id, userId]);

    // 🕒 HISTORY: Log reading activity when data loads successfully
    useEffect(() => {
        if (userId && data) {
            fetch(`http://localhost:5000/api/users/${userId}/history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contentId: id,
                    title: data.title,
                    type: type,
                    coverPhoto: data.coverPhoto
                })
            }).catch(err => console.error("History logging failed:", err));
        }
    }, [data, userId, id, type]);

    // 🔁 SAVE: Handle saving current item into chosen collection folder
    const handleAddToCollection = async (collectionId) => {
        if (!user) return alert("Please login first!");
        if (!data || isSaving) return;

        setIsSaving(true); // Start loading

        try {
            // Send the request directly to your item append route matching server.js
            const response = await fetch(`http://localhost:5000/api/collections/${collectionId}/add-item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: id, 
                    title: data.title, 
                    type: type, 
                    author: data.author 
                })
            });

            const result = await response.json();

            if (response.ok) {
                setToastMessage("Added to collection!");
                // Update local state dynamically using updated folder returned from MongoDB
                setCollections(prev => 
                    prev.map(col => col._id === collectionId ? result.collection : col)
                );
            } else {
                setToastMessage(result.message || "Already in this collection!");
            }
        } catch (err) {
            console.error("Network database sync failed:", err);
            setToastMessage("Server sync error.");
        } finally {
            setIsSaving(false); // Stop loading
            setIsDropdownOpen(false);
            setTimeout(() => setToastMessage(''), 3000);
        }
    };

    const handleFavorite = async () => {
        if (!user) return alert("Please login first!");

        try {
            const response = await fetch('http://localhost:5000/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: userId, 
                    contentId: id, 
                    title: data.title, 
                    type: type 
                })
            });

            if (response.ok) {
                setIsFavorite(true);
                alert("Added to Favorites!");
            } else {
                alert("Failed to save.");
            }
        } catch (err) {
            console.error("Error saving favorite:", err);
        }
    };

    const handleLike = async () => {
        if (!user) return alert("Please login to like!");
        
        try {
            const response = await fetch(`http://localhost:5000/api/${type}/${id}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            });

            const result = await response.json();
            if (response.ok) {
                setIsLiked(!isLiked);
                // Update numerical counter dynamically from server return value
                setLikesCount(result.likesCount !== undefined ? result.likesCount : (isLiked ? likesCount - 1 : likesCount + 1));
            }
        } catch (err) {
            console.error("Failed to process like event:", err);
        }
    };

    const handlePostComment = async () => {
        if (!user) return alert("Please login to comment!");
        if (!commentText.trim()) return;

        const res = await fetch(`http://localhost:5000/api/${type}/${id}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, username: user.username, text: commentText })
        });
        const updatedComments = await res.json();
        setComments(updatedComments);
        setCommentText("");
    };

    if (!data) return <div className="loading">Loading...</div>;

    return (
        <div className="read-page-container">
            <div className="read-card">
                
                {/* 🏠 BACK TO HOME LINK */}
                <Link to="/" className="back-home-link">
                    ← Back to Home
                </Link>

                <h1>{data.title}</h1>
                <p className="author-name">By: {data.author}</p>
                
                <div className="interaction-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button onClick={handleFavorite} className="interact-btn">
                        {isFavorite ? '⭐ Favorited' : '☆ Favorite'}
                    </button>
                    
                    {/* ❤️ HEART / LIKE ACTION INTERACTION TRIGGER */}
                    <button 
                        onClick={handleLike} 
                        className={`interact-btn like-trigger ${isLiked ? 'liked' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <span style={{ color: isLiked ? '#ff4b4b' : 'inherit' }}>{isLiked ? '❤️' : '🤍'}</span>
                        <span>{likesCount}</span>
                    </button>

                    {/* 📚 ADD TO COLLECTION INTERACTIVE DROPDOWN */}
                    <div className="collection-select-wrapper" style={{ position: 'relative' }}>
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                            className="interact-btn collection-trigger"
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "📁 Add to Collection ▾"}
                        </button>

                        {toastMessage && (
                            <span className="collection-toast-alert">{toastMessage}</span>
                        )}

                        {isDropdownOpen && (
                            <div className="readpage-collection-menu">
                                <div className="menu-title-header">Choose List Target</div>
                                {collections.length === 0 ? (
                                    <div className="menu-row empty-row-text">No custom collections created yet.</div>
                                ) : (
                                    collections.map((folder) => (
                                        <button 
                                            key={folder._id} 
                                            className="menu-row"
                                            onClick={() => handleAddToCollection(folder._id)}
                                        >
                                            <span className="row-icon">{folder.icon || '📁'}</span>
                                            <span className="row-text">{folder.name}</span>
                                            <small className="row-badge">({folder.savedItems?.length || 0})</small>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <hr />
                <div className="content-body">
                    <p>{data.content}</p>
                </div>

                {/* Comment Section */}
                <div className="comment-section">
                    <h3>Comments</h3>
                    <textarea 
                        value={commentText} 
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..." 
                    />
                    <button onClick={handlePostComment} className="post-comment-btn">Post Comment</button>
                    
                    <div className="comment-list">
                        {comments.map((c, index) => (
                            <div key={index} className="comment-bubble">
                                <p><strong>{c.username}:</strong> {c.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReadPage;