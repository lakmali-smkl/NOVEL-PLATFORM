import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Favorites.css';

const Favorites = () => {
  const [favs, setFavs] = useState([]);
  const userStr = localStorage.getItem('user');
  // 2. Safely parse it
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    // 3. ONLY fetch if the user exists
    if (user && user.email) {
      fetch(`http://localhost:5000/api/users/${user.email}`)
        .then(res => res.json())
        .then(data => setFavs(data.favorites || []))
        .catch(err => console.error("Error fetching favorites:", err));
    }
  }, [user]); // React might warn about object dependency, but this is safe here

  // 4. Guard clause: If no user, show a message instead of crashing
  if (!user) {
    return <div className="fav-content"><h2>Please login to see your favorites.</h2></div>;
  }

  const handleDelete = async (contentId) => {
  if (window.confirm("Remove from favorites?")) {
    try {
      // Use the user's _id and the item's contentId
      const response = await fetch(`http://localhost:5000/api/users/${user._id}/favorites/${contentId}`, { 
        method: 'DELETE' 
      });
      
      if (response.ok) {
        // Filter the UI using contentId since that's what your state uses
        setFavs(prevFavs => prevFavs.filter(item => item.contentId !== contentId));
      } else {
        const errorData = await response.json();
        console.error("Server error:", errorData.message);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }
};

  return (
    <div className="fav-content">
      <h2>My Saved Favorites</h2>
      <div className="fav-list">
        {favs.length > 0 ? (
          favs.map(item => (
            <div key={item.contentId} className="fav-card">
              <h3>{item.title}</h3>


              <div className="fav-actions">
              <Link to={`/read/${item.type}/${item.contentId}`} className="read-btn">
                Read Now
              </Link>
              <button 
                className="delete-btn" 
                onClick={() => handleDelete(item.contentId)}
              >
                Remove
              </button>
            </div>
            </div>
          ))
        ) : (
          <p>No favorites saved yet.</p>
        )}
      </div>
    </div>
  );
};

export default Favorites;