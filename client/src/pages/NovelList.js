import React, { useEffect, useState } from 'react';
import './NovelList.css';
import { Link } from 'react-router-dom';

import { API_BASE_URL } from '../config';
const NovelList = () => {
  const [novels, setNovels] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/novels`)
      .then(res => res.json())
      .then(data => setNovels(data))
      .catch(err => console.error("Error:", err));
  }, []);

  return (
    <div className="novel-gallery">
      <div className="novel-grid">
        {novels.map(novel => (
          <div key={novel._id} className="novel-card">
            {/* Display the Cover Photo */}
            {novel.coverPhoto && (
              <img 
                src={`${API_BASE_URL}/${novel.coverPhoto}`} 
                alt={novel.title} 
                className="cover-img"
              />
            )}
            <div className="novel-info">
              <h3>{novel.title}</h3>
              <p className="author">By: {novel.author}</p>
              <p className="excerpt">{novel.content?.substring(0, 100)}...</p>
              <Link to={`/read/novel/${novel._id}`}>
                <button className="read-btn">Read More</button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NovelList;