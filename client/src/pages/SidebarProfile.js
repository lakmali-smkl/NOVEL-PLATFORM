import React from 'react';
import './SidebarProfile.css';

import { API_BASE_URL as API } from '../config';
const roleConfig = {
  admin:  { label: 'Administrator', color: '#3399ff', bg: 'rgba(0,123,255,0.12)', border: 'rgba(0,123,255,0.3)',  icon: '🛡️' },
  writer: { label: 'Writer',        color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', icon: '✍️' },
  reader: { label: 'Reader',        color: '#a855f7', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)', icon: '📖' },
};

const SidebarProfile = ({ user }) => {
  if (!user) return null;

  const role = user.isAdmin ? 'admin' : user.isWriter ? 'writer' : 'reader';
  const cfg  = roleConfig[role];
  const initial = (user.username || '?').charAt(0).toUpperCase();

  return (
    <div className="sbp-card">
      {/* Avatar */}
      <div className="sbp-avatar-wrap">
        {user.profilePicture ? (
          <img
            src={`${API}/${user.profilePicture}`}
            alt="avatar"
            className="sbp-avatar-img"
          />
        ) : (
          <div className="sbp-avatar-placeholder" style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, color: cfg.color }}>
            {initial}
          </div>
        )}
        {/* Online dot */}
        <span className="sbp-online-dot" />
      </div>

      {/* Info */}
      <div className="sbp-info">
        <p className="sbp-name">{user.username}</p>
        <span className="sbp-role-badge" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
          {cfg.icon} {cfg.label}
        </span>
      </div>
    </div>
  );
};

export default SidebarProfile;
