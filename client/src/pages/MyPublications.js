import React, { useEffect, useState } from 'react';

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
        const [novelsRes, articlesRes] = await Promise.all([
          fetch(`http://localhost:5000/api/novels/author/${user._id}`),
          fetch(`http://localhost:5000/api/articles/author/${user._id}`)
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

  if (loading) return <div className="page-container"><p>Loading...</p></div>;

  return (
    <div className="page-container">
      <h2>My Publications</h2>
      {works.length === 0 ? (
        <p>You haven't published any works yet.</p>
      ) : (
        <div className="works-list">
          {works.map(work => (
            <div key={work._id} className="work-item">
              <h3>{work.title}</h3>
              <span className="work-type">{work.workType}</span>
              <p className="work-date">Created: {new Date(work.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPublications;