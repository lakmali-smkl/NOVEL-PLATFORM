import React, { useState } from 'react';
import NovelList from './NovelList';
import ArticleList from './ArticleList';
import './Library.css'; // We will create this next

const Library = () => {
  const [activeTab, setActiveTab] = useState('novels'); // Default to 'novels'

  return (
    <div className="library-container">
      <h1>My Library</h1>
      
      {/* The Portal Tabs */}
      <div className="tab-buttons">
        <button 
          className={activeTab === 'novels' ? 'active' : ''} 
          onClick={() => setActiveTab('novels')}
        >
          Novels
        </button>
        <button 
          className={activeTab === 'articles' ? 'active' : ''} 
          onClick={() => setActiveTab('articles')}
        >
          Articles
        </button>
      </div>

      {/* Conditional Rendering: Show content based on activeTab */}
      <div className="library-content">
        {activeTab === 'novels' ? <NovelList /> : <ArticleList />}
      </div>
    </div>
  );
};

export default Library;