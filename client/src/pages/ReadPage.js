import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import './ReadPage.css';

const ReadPage = () => {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const targetCommentId = searchParams.get('commentId');
    const targetReplyId = searchParams.get('replyId');
    const [highlightedId, setHighlightedId] = useState(null);
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

    const handleMessageWriter = async () => {
        if (!user) {
            alert("Please login first to chat with the writer!");
            navigate('/login');
            return;
        }
        
        try {
            const res = await fetch(`http://localhost:5000/api/users/status/${data.authorId}`);
            const authorData = await res.json();
            if (res.ok && authorData.username) {
                navigate(`/chat/${authorData.username}`);
            } else {
                navigate(`/chat/${data.author}`);
            }
        } catch (err) {
            console.error("Error navigating to chat:", err);
            navigate(`/chat/${data.author}`);
        }
    };

    const [activeReplyCommentId, setActiveReplyCommentId] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [visibleReplies, setVisibleReplies] = useState({});

    // 🔗 DEEP LINK: jump to a specific comment/reply from a notification (Facebook-style)
    useEffect(() => {
        if (!targetCommentId || comments.length === 0) return;

        if (targetReplyId) {
            setVisibleReplies(prev => ({ ...prev, [targetCommentId]: true }));
        }

        // Wait a tick so the reply list (if just expanded) is in the DOM before scrolling
        const scrollTimer = setTimeout(() => {
            const elementId = targetReplyId ? `reply-${targetReplyId}` : `comment-${targetCommentId}`;
            const el = document.getElementById(elementId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setHighlightedId(targetReplyId || targetCommentId);
                setTimeout(() => setHighlightedId(null), 2500);
            }
        }, 300);

        return () => clearTimeout(scrollTimer);
    }, [comments, targetCommentId, targetReplyId]);

    const handlePostReply = async (commentId) => {
        if (!user) return alert("Please login to reply!");
        if (!replyText.trim()) return;

        try {
            const res = await fetch(`http://localhost:5000/api/${type}/${id}/comment/${commentId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, username: user.username, text: replyText })
            });
            if (res.ok) {
                const updatedComments = await res.json();
                setComments(updatedComments);
                setReplyText("");
                setActiveReplyCommentId(null);
                // Auto-expand replies for this comment
                setVisibleReplies(prev => ({ ...prev, [commentId]: true }));
            } else {
                alert("Failed to submit reply");
            }
        } catch (err) {
            console.error("Error submitting reply:", err);
            alert("Connection error");
        }
    };

    const toggleReplies = (commentId) => {
        setVisibleReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Are you sure you want to delete this comment?")) return;
        try {
            const res = await fetch(`http://localhost:5000/api/${type}/${id}/comment/${commentId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            if (res.ok) {
                const updatedComments = await res.json();
                setComments(updatedComments);
            } else {
                alert("Failed to delete comment");
            }
        } catch (err) {
            console.error("Error deleting comment:", err);
        }
    };

    const handleDeleteReply = async (commentId, replyId) => {
        if (!window.confirm("Are you sure you want to delete this reply?")) return;
        try {
            const res = await fetch(`http://localhost:5000/api/${type}/${id}/comment/${commentId}/reply/${replyId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            if (res.ok) {
                const updatedComments = await res.json();
                setComments(updatedComments);
            } else {
                alert("Failed to delete reply");
            }
        } catch (err) {
            console.error("Error deleting reply:", err);
        }
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
                <div className="author-section-read">
                    <p className="author-name">By: {data.author}</p>
                    {userId !== data.authorId && (
                        <button onClick={handleMessageWriter} className="message-writer-btn">
                            <span className="message-writer-icon">💬</span>
                            Message Writer
                        </button>
                    )}
                </div>
                
                <div className="interaction-bar">
                    <button onClick={handleFavorite} className={`interact-btn ${isFavorite ? 'active-fav' : ''}`}>
                        <span className="interact-icon">{isFavorite ? '⭐' : '☆'}</span>
                        {isFavorite ? 'Favorited' : 'Favorite'}
                    </button>

                    {/* ❤️ HEART / LIKE ACTION INTERACTION TRIGGER */}
                    <button
                        onClick={handleLike}
                        className={`interact-btn like-trigger ${isLiked ? 'active-like' : ''}`}
                    >
                        <span className="interact-icon">{isLiked ? '❤️' : '🤍'}</span>
                        <span>{likesCount}</span>
                    </button>

                    {/* 📚 ADD TO COLLECTION INTERACTIVE DROPDOWN */}
                    <div className="collection-select-wrapper" style={{ position: 'relative' }}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="interact-btn collection-trigger"
                            disabled={isSaving}
                        >
                            <span className="interact-icon">📁</span>
                            {isSaving ? "Saving..." : "Add to Collection"}
                            <span className="dropdown-caret">▾</span>
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
                        {comments.map((c, index) => {
                            const commentId = c._id || index;
                            const isCommentAuthor = data.authorId && c.userId && (data.authorId.toString() === c.userId.toString());
                            const hasReplies = c.replies && c.replies.length > 0;
                            const showReplies = !!visibleReplies[commentId];

                            const canDeleteComment = user && (
                                (c.userId && c.userId.toString() === userId) ||
                                (data.authorId && data.authorId.toString() === userId)
                            );

                            return (
                                <div
                                    key={commentId}
                                    id={c._id ? `comment-${c._id}` : undefined}
                                    className={`comment-card ${highlightedId === c._id ? 'comment-card-highlighted' : ''}`}
                                >
                                    <div className="comment-main">
                                        <div className="comment-avatar">
                                            {c.username ? c.username.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div className="comment-details">
                                            <div className="comment-header">
                                                <span className="comment-username">
                                                    {c.username}
                                                    {isCommentAuthor && <span className="author-badge">Author</span>}
                                                </span>
                                                <span className="comment-time">
                                                    {c.createdAt ? (
                                                        <>
                                                            {new Date(c.createdAt).toLocaleDateString()} at {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </>
                                                    ) : 'Just now'}
                                                </span>
                                            </div>
                                            <p className="comment-text">{c.text}</p>
                                            
                                            <div className="comment-actions">
                                                <button 
                                                    onClick={() => {
                                                        if (activeReplyCommentId === commentId) {
                                                            setActiveReplyCommentId(null);
                                                        } else {
                                                            setActiveReplyCommentId(commentId);
                                                            setReplyText("");
                                                        }
                                                    }}
                                                    className="comment-action-btn reply-btn-trigger"
                                                >
                                                    ↩ Reply
                                                </button>

                                                {hasReplies && (
                                                    <button 
                                                        onClick={() => toggleReplies(commentId)}
                                                        className="comment-action-btn toggle-replies-btn"
                                                    >
                                                        {showReplies ? `Hide Replies` : `View Replies (${c.replies.length})`}
                                                    </button>
                                                )}

                                                {canDeleteComment && (
                                                    <button 
                                                        onClick={() => handleDeleteComment(c._id)} 
                                                        className="comment-action-btn delete-btn-trigger"
                                                        style={{ color: '#ff4b4b' }}
                                                    >
                                                        🗑 Delete
                                                    </button>
                                                )}
                                            </div>

                                            {/* Reply Input Box */}
                                            {activeReplyCommentId === commentId && (
                                                <div className="reply-input-box">
                                                    <textarea 
                                                        value={replyText} 
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        placeholder={`Reply to ${c.username}...`}
                                                    />
                                                    <div className="reply-box-actions">
                                                        <button 
                                                            onClick={() => setActiveReplyCommentId(null)}
                                                            className="reply-cancel-btn"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button 
                                                            onClick={() => handlePostReply(c._id)}
                                                            className="reply-submit-btn"
                                                        >
                                                            Reply
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Nested Replies */}
                                    {hasReplies && showReplies && (
                                        <div className="replies-container">
                                            {c.replies.map((reply, rIndex) => {
                                                const replyId = reply._id || rIndex;
                                                const isReplyAuthor = data.authorId && reply.userId && (data.authorId.toString() === reply.userId.toString());
                                                const canDeleteReply = user && (
                                                    (reply.userId && reply.userId.toString() === userId) ||
                                                    (data.authorId && data.authorId.toString() === userId)
                                                );

                                                return (
                                                    <div
                                                        key={replyId}
                                                        id={reply._id ? `reply-${reply._id}` : undefined}
                                                        className={`reply-card ${highlightedId === reply._id ? 'reply-card-highlighted' : ''}`}
                                                    >
                                                        <div className="reply-avatar">
                                                            {reply.username ? reply.username.charAt(0).toUpperCase() : '?'}
                                                        </div>
                                                        <div className="reply-details">
                                                            <div className="reply-header" style={{ display: 'flex', alignItems: 'center' }}>
                                                                <span className="reply-username">
                                                                    {reply.username}
                                                                    {isReplyAuthor && <span className="author-badge">Author</span>}
                                                                </span>
                                                                <span className="reply-time" style={{ marginLeft: '8px' }}>
                                                                    {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString() : 'Just now'}
                                                                </span>
                                                                {canDeleteReply && (
                                                                    <button 
                                                                        onClick={() => handleDeleteReply(c._id, reply._id)} 
                                                                        className="reply-delete-btn"
                                                                        style={{ background: 'none', border: 'none', color: '#ff4b4b', cursor: 'pointer', fontSize: '0.8rem', marginLeft: 'auto', padding: '0 4px' }}
                                                                    >
                                                                        🗑 Delete
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="reply-text">{reply.text}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReadPage;