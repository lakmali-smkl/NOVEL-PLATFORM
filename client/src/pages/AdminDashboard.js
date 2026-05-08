import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

const AdminDashboard = () => {
    // 1. Initialize with 0s so the UI doesn't crash on first render
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalWriters: 0,
        pendingApprovals: 0,
        totalWorks: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/admin/stats');
                
                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}`);
                }

                const data = await response.json();
                
                // 2. Ensure data exists before setting state
                if (data) {
                    setStats({
                        totalUsers: data.totalUsers || 0,
                        totalWriters: data.totalWriters || 0,
                        pendingApprovals: data.pendingApprovals || 0,
                        totalWorks: data.totalWorks || 0
                    });
                }
            } catch (err) {
                console.error("Fetch Error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // 3. Conditional Rendering (Prevents "Uncaught Error")
    if (loading) return <div className="admin-loader">Initializing Dashboard...</div>;
    if (error) return <div className="admin-error">Error: {error}</div>;

    return (
        <div className="admin-main-content">
            <header className="admin-welcome">
                <h1>System Overview</h1>
                <p>Welcome back, Administrator.</p>
            </header>

            <div className="admin-stats-container">
                <div className="admin-stat-box blue">
                    <h3>{stats.totalUsers}</h3>
                    <p>Total Registered Users</p>
                </div>
                <div className="admin-stat-box red">
                    <h3>{stats.totalWriters}</h3>
                    <p>Verified Writers</p>
                </div>
                <div className="admin-stat-box gold">
                    <h3>{stats.pendingApprovals}</h3>
                    <p>Pending Applications</p>
                </div>
                <div className="admin-stat-box green">
                    <h3>{stats.totalWorks}</h3>
                    <p>Total Publications</p>
                </div>
            </div>
            
            {/* Split View */}
            <div className="admin-split-view">
                <div className="admin-recent-users">
                    <h3>Management</h3>
                    <p>Quick access to user controls.</p>
                </div>
                <div className="admin-pending-tasks">
                    <h3>Immediate Actions</h3>
                    <button className="action-alert-btn">
                        Review {stats.pendingApprovals} Writer Requests
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;