import React, { useEffect, useState } from 'react';

const ArticleList = () => {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    // This fetches the articles from your backend
    fetch('http://localhost:5000/api/articles')
      .then(res => res.json())
      .then(data => setArticles(data))
      .catch(err => console.error("Error fetching articles:", err));
  }, []);

  return (
    <div className="article-list">
      {articles.length > 0 ? (
        articles.map(article => (
          <div key={article._id} className="article-card" style={{ padding: '20px', border: '1px solid #ddd', margin: '10px 0' }}>
            <h3>{article.title}</h3>
            <p><strong>By:</strong> {article.author}</p>
            <p>{article.content}</p>
          </div>
        ))
      ) : (
        <p>No articles found.</p>
      )}
    </div>
  );
};

export default ArticleList;