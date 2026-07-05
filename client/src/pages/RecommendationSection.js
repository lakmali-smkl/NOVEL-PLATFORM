import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './RecommendationSection.css';

const API_BASE = 'http://localhost:5000';

const RecommendationSection = ({ user }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [hasHistory, setHasHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  const userId = user?._id || user?.id;

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    fetch(`${API_BASE}/api/recommendations/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.recommendations) {
          setRecommendations(data.recommendations);
          setHasHistory(data.hasHistory);
        }
      })
      .catch(err => console.error("Recommendations error:", err))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <section className="rec-section">
        <div className="rec-header">
          <span className="rec-ai-label">✨ AI</span>
          <h2>Recommended for You</h2>
        </div>
        <div className="rec-skeleton-row">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rec-skeleton-card">
              <div className="skeleton-img"></div>
              <div className="skeleton-line short"></div>
              <div className="skeleton-line long"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <section className="rec-section">
      <div className="rec-header">
        <div className="rec-title-group">
          <span className="rec-ai-label">✨ AI</span>
          <h2>{hasHistory ? 'Recommended for You' : '🔥 Popular Right Now'}</h2>
        </div>
        <p className="rec-subtitle">
          {hasHistory
            ? 'Personalised picks based on your reading history'
            : 'Top picks on the platform — start reading to get personalised picks!'}
        </p>
      </div>

      <div className="rec-scroll-track">
        {recommendations.map((item, index) => (
          <Link
            to={`/read/${item.type}/${item._id}`}
            key={item._id}
            className="rec-card"
            style={{ animationDelay: `${index * 0.06}s` }}
          >
            {/* Cover Image */}
            <div className="rec-card-img-wrap">
              {item.coverPhoto ? (
                <img
                  src={`${API_BASE}/${item.coverPhoto}`}
                  alt={item.title}
                  className="rec-card-img"
                />
              ) : (
                <div className="rec-card-img-placeholder">
                  {item.title.charAt(0)}
                </div>
              )}
              {/* AI Badge */}
              <span className="rec-ai-badge">✨ AI Pick</span>
              {/* Type Badge */}
              <span className={`rec-type-badge ${item.type}`}>
                {item.type === 'novel' ? '📖 Novel' : '📝 Article'}
              </span>
            </div>

            {/* Card Body */}
            <div className="rec-card-body">
              <h3 className="rec-card-title">{item.title}</h3>
              <p className="rec-card-author">by {item.author}</p>
              {item.genre && item.genre !== 'other' && (
                <span className="rec-genre-tag">{item.genre}</span>
              )}
              <p className="rec-reason">💡 {item.reason}</p>
              <div className="rec-card-meta">
                <span>👁 {item.views.toLocaleString()}</span>
                <span>❤️ {item.likes}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RecommendationSection;
