import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './ReadPage.css';

const ReadPage = () => {
    const { type, id } = useParams(); 
    const [data, setData] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [comments, setComments] = useState([]);

    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const url = user ? `http://localhost:5000/api/${type}s/${id}?userId=${user._id}` : `http://localhost:5000/api/${type}s/${id}`;
        fetch(url)
        .then(res => res.json())
        .then(data => {
            setData(data);
            setComments(data.comments || []);
            // Check if user has liked this already
            if (user && data.likes?.includes(user._id)) setIsLiked(true);
        });
    }, [type, id, user]);

    const handleFavorite = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return alert("Please login first!");

    try {
        const response = await fetch('http://localhost:5000/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userId: user._id, 
            contentId: id, 
            title: data.title, 
            type: type 
        })
        });

        if (response.ok) {
        setIsFavorite(true); // <--- This uses the function and removes the warning
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
        await fetch(`http://localhost:5000/api/${type}/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id })
        });
        setIsLiked(!isLiked);
    };

    const handlePostComment = async () => {
        if (!user) return alert("Please login to comment!");
        const res = await fetch(`http://localhost:5000/api/${type}/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, username: user.username, text: commentText })
        });
        const updatedComments = await res.json();
        setComments(updatedComments);
        setCommentText("");
    };

  if (!data) return <div className="loading">Loading...</div>;

  return (
    <div className="read-page-container">
      <div className="read-card">
        <h1>{data.title}</h1>
        <p className="author-name">By: {data.author}</p>
        
        <div className="interaction-bar">
            <button onClick={handleFavorite}>
                {isFavorite ? '❤️' : '🤍'}
            </button>
            
            <button onClick={handleLike} style={{ color: isLiked ? 'red' : 'black' }}>
                {isLiked ? 'Liked' : '👍'}
            </button>
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
          <button onClick={handlePostComment}>Post Comment</button>
          
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