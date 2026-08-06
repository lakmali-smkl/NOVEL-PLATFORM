import React, { useState, useEffect } from 'react';
import './UserDirectory.css';

import { API_BASE_URL } from '../config';
const UserDirectory = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          throw new Error(`Server responded with status: ${response.status}`);
        }
      } catch (err) {
        console.error("Failed to load administrative user directory:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Action Handlers
  const toggleWriterRole = async (userId, currentStatus) => {
    // Optimistic UI update
    setUsers(users.map(u => u._id === userId ? { ...u, isWriter: !currentStatus } : u));
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/toggle-writer`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        // revert optimistic change on failure
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, isWriter: currentStatus } : u));
        const text = await res.text();
        console.error('Failed to toggle writer role:', res.status, text);
        alert('Failed to update writer role on server.');
      }
    } catch (err) {
      console.error("Role update exception:", err);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isWriter: currentStatus } : u));
      alert('Network error: could not update writer role.');
    }
  };

  const updateUserStatus = async (userId, newStatus) => {
    // Optimistic UI update
    setUsers(users.map(u => u._id === userId ? { ...u, status: newStatus } : u));
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        // revert optimistic change on failure
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, status: newStatus === 'suspended' ? 'active' : 'suspended' } : u));
        const text = await res.text();
        console.error('Failed to update status:', res.status, text);
        alert('Failed to update account status on server.');
      }
    } catch (err) {
      console.error("Status update exception:", err);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, status: newStatus === 'suspended' ? 'active' : 'suspended' } : u));
      alert('Network error: could not update account status.');
    }
  };

  // Row click → open detail modal for that user
  const openUserDetail = async (user) => {
    setSelectedUser(user);
    setUserDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${user._id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error(`Server responded with status: ${res.status}`);
      const data = await res.json();
      setUserDetail(data);
    } catch (err) {
      console.error('Failed to load user detail:', err);
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeUserDetail = () => {
    setSelectedUser(null);
    setUserDetail(null);
    setDetailError(null);
  };

  // Filter Pipeline
  const filteredUsers = users.filter(user => {
    const username = user.username || '';
    const email = user.email || '';

    const matchesSearch = username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          email.toLowerCase().includes(searchTerm.toLowerCase());

    if (roleFilter === 'all') return matchesSearch;
    if (roleFilter === 'admin') return matchesSearch && user.isAdmin;
    if (roleFilter === 'writer') return matchesSearch && user.isWriter && !user.isAdmin;
    if (roleFilter === 'reader') return matchesSearch && !user.isWriter && !user.isAdmin;
    return matchesSearch;
  });

  // Derived Metrics
  const metrics = {
    total: users.length,
    writers: users.filter(u => u.isWriter && !u.isAdmin).length,
    suspended: users.filter(u => u.status === 'suspended').length
  };

  if (loading) return <div className="ud-loading">Loading Account Directory...</div>;

  if (error) return <div className="ud-error">⚠️ Connection Error: Failed to fetch data from backend. ({error})</div>;

  return (
    <div className="ud-workspace">

      {/* SECTION HEADER */}
      <div className="ud-header">
        <div>
          <h2><span className="ud-header-icon">👥</span> User Directory</h2>
          <p className="ud-subtitle">Manage user permissions, account privileges, and node activity states.</p>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="ud-metrics-grid">
        <div className="ud-metric-card">
          <div className="ud-metric-icon ud-metric-icon-total">🧑‍🤝‍🧑</div>
          <div>
            <span className="ud-metric-label">Total Accounts</span>
            <span className="ud-metric-value">{metrics.total}</span>
          </div>
        </div>
        <div className="ud-metric-card">
          <div className="ud-metric-icon ud-metric-icon-writers">✍️</div>
          <div>
            <span className="ud-metric-label">Independent Writers</span>
            <span className="ud-metric-value ud-metric-value-writers">{metrics.writers}</span>
          </div>
        </div>
        <div className="ud-metric-card">
          <div className="ud-metric-icon ud-metric-icon-suspended">⛔</div>
          <div>
            <span className="ud-metric-label">Suspended Nodes</span>
            <span className="ud-metric-value ud-metric-value-suspended">{metrics.suspended}</span>
          </div>
        </div>
      </div>

      {/* FILTER BAR MANAGEMENT */}
      <div className="ud-filter-bar">
        <div className="ud-filter-label">
          <span className="ud-filter-icon">⚙️</span> Filters
        </div>
        <div className="ud-search-wrap">
          <span className="ud-search-icon">🔎</span>
          <input
            type="text"
            className="ud-search-input"
            placeholder="Search by username or email asset..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="ud-search-clear"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <select
          className="ud-role-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Structural Roles</option>
          <option value="admin">Administrators</option>
          <option value="writer">Writers</option>
          <option value="reader">Readers Only</option>
        </select>
      </div>

      {/* DATA GRID TABLE */}
      <div className="ud-table-wrap">
        <table className="ud-table">
          <thead>
            <tr>
              <th>Identified User</th>
              <th>System Role</th>
              <th>Node Status</th>
              <th>Registration Date</th>
              <th className="ud-text-right">Administrative Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user._id}
                className={`ud-row-clickable ${user.status === 'suspended' ? 'ud-row-suspended' : ''}`}
                onClick={() => openUserDetail(user)}
              >
                <td>
                  <div className="ud-user-cell">
                    <div className="ud-user-avatar">{(user.username || '?').charAt(0).toUpperCase()}</div>
                    <div className="ud-user-text">
                      <span className="ud-username">{user.username}</span>
                      <span className="ud-email">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="ud-roles-group">
                    {user.isAdmin && <span className="ud-pill ud-badge-admin">Admin</span>}
                    {user.isWriter && <span className="ud-pill ud-badge-writer">Writer</span>}
                    {!user.isAdmin && !user.isWriter && <span className="ud-pill ud-badge-reader">Reader</span>}
                  </div>
                </td>
                <td>
                  <span className={`ud-status-tag ud-status-${user.status || 'active'}`}>
                    <span className="ud-status-dot"></span>
                    {user.status || 'active'}
                  </span>
                </td>
                <td className="ud-date-cell">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'N/A'
                  }
                </td>
                <td>
                  <div className="ud-action-group" onClick={(e) => e.stopPropagation()}>
                    {!user.isAdmin && (
                      <>
                        <button
                          className={`ud-btn ${user.isWriter ? 'ud-btn-revoke' : 'ud-btn-grant'}`}
                          onClick={() => toggleWriterRole(user._id, user.isWriter)}
                        >
                          {user.isWriter ? 'Demote to Reader' : 'Promote to Writer'}
                        </button>

                        {user.status === 'suspended' ? (
                          <button
                            className="ud-btn ud-btn-activate"
                            onClick={() => updateUserStatus(user._id, 'active')}
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            className="ud-btn ud-btn-suspend"
                            onClick={() => updateUserStatus(user._id, 'suspended')}
                          >
                            Suspend
                          </button>
                        )}
                      </>
                    )}
                    {user.isAdmin && <span className="ud-immutable-label">System Owner</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="ud-table-empty">No workspace nodes found matching your database records.</div>
        )}
      </div>

      {/* USER DETAIL MODAL */}
      {selectedUser && (
        <div className="ud-modal-overlay" onClick={closeUserDetail}>
          <div className="ud-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ud-modal-close" onClick={closeUserDetail} aria-label="Close">✕</button>

            {detailLoading && <div className="ud-loading">Loading user details...</div>}

            {detailError && (
              <div className="ud-error">⚠️ Failed to load user details. ({detailError})</div>
            )}

            {!detailLoading && !detailError && userDetail && (
              <>
                <div className="ud-modal-header">
                  <div className="ud-user-avatar ud-modal-avatar">
                    {(userDetail.user.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="ud-modal-username">{userDetail.user.username}</h3>
                    <span className="ud-email">{userDetail.user.email}</span>
                    <div className="ud-roles-group ud-modal-roles">
                      {userDetail.user.isAdmin && <span className="ud-pill ud-badge-admin">Admin</span>}
                      {userDetail.user.isWriter && <span className="ud-pill ud-badge-writer">Writer</span>}
                      {!userDetail.user.isAdmin && !userDetail.user.isWriter && <span className="ud-pill ud-badge-reader">Reader</span>}
                      <span className={`ud-status-tag ud-status-${userDetail.user.status || 'active'}`}>
                        <span className="ud-status-dot"></span>
                        {userDetail.user.status || 'active'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ud-modal-meta">
                  <span>Joined: {userDetail.user.createdAt ? new Date(userDetail.user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                </div>

                <div className="ud-modal-stats">
                  <div className="ud-modal-stat">
                    <span className="ud-modal-stat-value">{userDetail.totals.totalWorks}</span>
                    <span className="ud-modal-stat-label">Works</span>
                  </div>
                  <div className="ud-modal-stat">
                    <span className="ud-modal-stat-value">❤️ {userDetail.totals.totalLikes}</span>
                    <span className="ud-modal-stat-label">Total Likes</span>
                  </div>
                  <div className="ud-modal-stat">
                    <span className="ud-modal-stat-value">💬 {userDetail.totals.totalComments}</span>
                    <span className="ud-modal-stat-label">Total Comments</span>
                  </div>
                  <div className="ud-modal-stat">
                    <span className="ud-modal-stat-value">👁️ {userDetail.totals.totalViews}</span>
                    <span className="ud-modal-stat-label">Total Views</span>
                  </div>
                </div>

                {userDetail.works.length === 0 ? (
                  <div className="ud-table-empty">This user hasn't created any stories or articles yet.</div>
                ) : (
                  <div className="ud-modal-table-wrap">
                    <table className="ud-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Likes</th>
                          <th>Comments</th>
                          <th>Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDetail.works.map((work) => (
                          <tr key={work._id}>
                            <td>{work.title}</td>
                            <td className="ud-modal-type-cell">{work.workType === 'novel' ? '📖 Story' : '📝 Article'}</td>
                            <td>
                              <span className={`ud-status-tag ud-status-${work.status}`}>
                                <span className="ud-status-dot"></span>
                                {work.status}
                              </span>
                            </td>
                            <td>❤️ {work.likeCount}</td>
                            <td>💬 {work.commentCount}</td>
                            <td>👁️ {work.views}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default UserDirectory;
