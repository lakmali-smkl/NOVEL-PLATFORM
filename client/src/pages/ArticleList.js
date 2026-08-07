import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './ArticleList.css';

import { API_BASE_URL, resolveMediaUrl } from '../config';
const ArticleList = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This fetches the articles from your backend
    fetch(`${API_BASE_URL}/api/articles`)
      .then(res => res.json())
      .then(data => setArticles(data))
      .catch(err => console.error("Error fetching articles:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="article-list"><p className="article-list-status">Loading articles...</p></div>;
  }

  if (articles.length === 0) {
    return <div className="article-list"><p className="article-list-status">No articles found.</p></div>;
  }

  return (
    <div className="article-list">
      {articles.map(article => (
        <div key={article._id} className="article-card">
          {article.coverPhoto && (
            <img
              src={resolveMediaUrl(article.coverPhoto)}
              alt={article.title}
            />
          )}
          <h3>{article.title}</h3>
          <p><strong>By:</strong> {article.author}</p>
          <p>{article.content?.substring(0, 100)}...</p>

          <Link to={`/read/article/${article._id}`}>
            <button className="read-btn">Read More</button>
          </Link>
        </div>
      ))}
    </div>
  );
};

export default ArticleList;