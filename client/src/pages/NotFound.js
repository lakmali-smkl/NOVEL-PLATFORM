import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="notfound-page">
      <div className="notfound-code">404</div>
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist or may have been moved.</p>
      <Link to="/" className="notfound-home-link">← Back to Home</Link>
    </div>
  );
};

export default NotFound;
