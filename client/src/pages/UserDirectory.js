import React, { useState, useEffect } from 'react';
import './UserDirectory.css';

import { API_BASE_URL } from '../config';
const UserDirectory = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
              <tr key={user._id} className={user.status === 'suspended' ? 'ud-row-suspended' : ''}>
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
                  <div className="ud-action-group">
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

    </div>
  );
};

export default UserDirectory;
