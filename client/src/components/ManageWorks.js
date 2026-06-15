import React, { useEffect, useState } from 'react';

import './ManageWorks.css';

const ManageWorks = ({ user }) => {
  const [works, setWorks] = useState([]);
  

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
            </tr>
          </thead>
          <tbody>
            {works.map((work) => (
              <tr key={work._id}>
                <td>{work.title}</td>
                <td>{work.type ? work.type.charAt(0).toUpperCase() + work.type.slice(1) : 'Unknown'}</td>
                <td>{new Date(work.createdAt).toLocaleDateString()}</td>
                <td className="action-buttons">
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