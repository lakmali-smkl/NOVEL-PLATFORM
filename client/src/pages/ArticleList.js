import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './ArticleList.css';

import { API_BASE_URL } from '../config';
const ArticleList = () => {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    // This fetches the articles from your backend
    fetch(`${API_BASE_URL}/api/articles`)
      .then(res => res.json())
      .then(data => setArticles(data))
      .catch(err => console.error("Error fetching articles:", err));
  }, []);

  return (
    <div className="article-list">
      {articles.length > 0 ? (
        articles.map(article => (
          <div key={article._id} className="article-card" style={{ padding: '20px', border: '1px solid #ddd', margin: '10px 0' }}>
            {article.coverPhoto && (
              <img 
                src={`${API_BASE_URL}/${article.coverPhoto}`} 
                alt={article.title} 
                style={{ width: '100%', height: 'auto', marginBottom: '10px' }} 
              />
            )}
            <h3>{article.title}</h3>
            <p><strong>By:</strong> {article.author}</p>
            <p>{article.content?.substring(0, 100)}...</p>

            <Link to={`/read/article/${article._id}`}>
              <button className="read-btn">Read More</button>
            </Link>
          </div>
        ))
      ) : (
        <p>No articles found.</p>
      )}
    </div>
  );
};

export default ArticleList;