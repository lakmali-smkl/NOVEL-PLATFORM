import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ManageWorks.css';

const ManageWorks = ({ user }) => {
  const [works, setWorks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        const [novelRes, articleRes] = await Promise.all([
          fetch('http://localhost:5000/api/novels'),
          fetch('http://localhost:5000/api/articles')
        ]);
        
        const allNovels = await novelRes.json();
        const allArticles = await articleRes.json();

        const myNovels = allNovels
            .filter(n => n.authorId === user._id) 
            .map(n => ({ ...n, type: 'novel' }));

            const myArticles = allArticles
            .filter(a => a.authorId === user._id) 
            .map(a => ({ ...a, type: 'article' }));

        setWorks([...myNovels, ...myArticles]);

      } catch (error) {
        console.error("Error loading works:", error);
      }
    };

    if (user) fetchWorks();
  }, [user]);

  const handleEdit = (work) => {
    if (work.type === 'novel') {
      navigate(`/edit-novel/${work._id}`);
    } else {
      navigate(`/edit-article/${work._id}`);
    }
  };

  return (
    <div className="action-card full-width">
      <h3>Your Publications</h3>
      {works.length === 0 ? (
        <p>You haven't posted any works yet.</p>
      ) : (
        <table className="works-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Date Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {works.map((work) => (
              <tr key={work._id}>
                <td>{work.title}</td>
                <td>{work.type ? work.type.charAt(0).toUpperCase() + work.type.slice(1) : 'Unknown'}</td>
                <td>{new Date(work.createdAt).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="writer-btn-small" 
                    onClick={() => handleEdit(work)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ManageWorks;