import React, { useState, useEffect } from 'react';
import './UserDirectory.css';

const UserDirectory = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/admin/users');
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
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/toggle-writer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
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
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

  if (loading) return <div className="directory-loading">Loading Account Directory...</div>;
  
  if (error) return <div className="table-empty" style={{color: '#da3633', padding: '40px'}}>⚠️ Connection Error: Failed to fetch data from backend. ({error})</div>;

  return (
    <div className="directory-workspace">
      
      {/* SECTION HEADER */}
      <div className="directory-header">
        <div>
          <h2>User Directory</h2>
          <p className="subtitle">Manage user permissions, account privileges, and node activity states.</p>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Total Accounts</span>
          <span className="metric-value">{metrics.total}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Independent Writers</span>
          <span className="metric-value writers-count">{metrics.writers}</span>
        </div>
        <div className="metric-card">
          <span className="metric-label">Suspended Nodes</span>
          <span className="metric-value suspended-count">{metrics.suspended}</span>
        </div>
      </div>

      {/* FILTER BAR MANAGEMENT */}
      <div className="filter-action-bar">
        <input 
          type="text" 
          className="search-input"
          placeholder="Search by username or email asset..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="role-select"
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
      <div className="table-responsive-wrapper">
        <table className="directory-table">
          <thead>
            <tr>
              <th>Identified User</th>
              <th>System Role</th>
              <th>Node Status</th>
              <th>Registration Date</th>
              <th className="text-right">Administrative Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user._id} className={user.status === 'suspended' ? 'row-suspended' : ''}>
                <td>
                  <div className="user-info-cell">
                    <span className="cell-username">{user.username}</span>
                    <span className="cell-email">{user.email}</span>
                  </div>
                </td>
                <td>
                  <div className="roles-pill-container">
                    {user.isAdmin && <span className="pill badge-admin">Admin</span>}
                    {user.isWriter && <span className="pill badge-writer">Writer</span>}
                    {!user.isAdmin && !user.isWriter && <span className="pill badge-reader">Reader</span>}
                  </div>
                </td>
                <td>
                  <span className={`status-tag dot-${user.status || 'active'}`}>
                    {user.status || 'active'}
                  </span>
                </td>
                <td className="date-cell">
                  {user.createdAt 
                    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'N/A'
                  }
                </td>
                <td>
                  <div className="action-button-group">
                    {!user.isAdmin && (
                      <>
                        {/* 💡 FIXED DISPLAY LABEL BELOW */}
                        <button 
                          className={`btn-table ${user.isWriter ? 'btn-revoke' : 'btn-grant'}`}
                          onClick={() => toggleWriterRole(user._id, user.isWriter)}
                        >
                          {user.isWriter ? 'Demote to Reader' : 'Promote to Writer'}
                        </button>
                        
                        {user.status === 'suspended' ? (
                          <button 
                            className="btn-table btn-activate" 
                            onClick={() => updateUserStatus(user._id, 'active')}
                          >
                            Activate
                          </button>
                        ) : (
                          <button 
                            className="btn-table btn-suspend" 
                            onClick={() => updateUserStatus(user._id, 'suspended')}
                          >
                            Suspend
                          </button>
                        )}
                      </>
                    )}
                    {user.isAdmin && <span className="immutable-label">System Owner</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="table-empty">No workspace nodes found matching your database records.</div>
        )}
      </div>

    </div>
  );
};

export default UserDirectory;