import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import './WriterDashboard.css';

const WriterDashboard = ({ user }) => {
  if (!user || user.isWriter !== true) {
    return <Navigate to="/" />;
  }

  return (
    <div className="writer-container">
      <Outlet />
    </div>
  );
};

export default WriterDashboard;