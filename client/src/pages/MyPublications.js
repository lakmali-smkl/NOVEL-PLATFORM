import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './MyPublications.css'; 

import { API_BASE_URL } from '../config';
const MyPublications = () => {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchMyWorks = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      try {
        const authHeaders = { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } };
        const [novelsRes, articlesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/novels/author/${user._id}`, authHeaders),
          fetch(`${API_BASE_URL}/api/articles/author/${user._id}`, authHeaders)
        ]);

        const novels = await novelsRes.json();
        const articles = await articlesRes.json();

        const allWorks = [
          ...novels.map(n => ({ ...n, workType: 'novel' })),
          ...articles.map(a => ({ ...a, workType: 'article' }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setWorks(allWorks);
      } catch (error) {
        console.error('Error fetching works:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyWorks();
  }, [user?._id]);

  if (loading) return <div className="page-container"><div className="loader">Loading...</div></div>;

  const handleDelete = async (work) => {
    if (window.confirm(`Are you sure you want to delete "${work.title}"?`)) {
      try {
        const endpoint = `${API_BASE_URL}/api/${work.workType}s/${work._id}`;
        const response = await fetch(endpoint, { method: 'DELETE' });

        if (response.ok) {
          setWorks(works.filter(w => w._id !== work._id));
          alert("Deleted successfully!");
        } else {
          alert("Failed to delete.");
        }
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };
  
  return (
    <div className="page-container">
      <header className="publications-header">
        <div>
          <h2>Manage My Publications</h2>
          <p className="subtitle">Manage your creative library</p>
        </div>
        <Link to="/add-novel" className="publish-btn">
          + New Publication
        </Link>
      </header>

      {works.length === 0 ? (
        <div className="empty-state">
          <p>You haven't published any works yet. Start your journey today!</p>
        </div>
      ) : (
        <div className="publications-grid">
          {works.map(work => (
            <div key={work._id} className="publication-card">
              <div className="card-tag">{work.workType}</div>
              
              <div className="card-info">
                <h3>{work.title}</h3>
                <span className="card-date">
                  {new Date(work.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>

              <div className="card-footer">
                <Link 
                  to={`/edit-${work.workType}/${work._id}`} 
                  className="btn-edit"
                >
                  Edit
                </Link>
                <button 
                  className="btn-delete" 
                  onClick={() => handleDelete(work)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPublications;