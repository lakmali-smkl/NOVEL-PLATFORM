import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminMainStats = ({ setActiveTab }) => {
    const navigate = useNavigate();
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

    if (loading) return <div className="admin-loader">Initializing Dashboard...</div>;
    if (error) return <div className="admin-error">Error: {error}</div>;

    return (
        <div className="admin-main-content">
            <header className="admin-welcome">
                <h1>Command Center</h1>
                <p>Real-time platform metrics and management.</p>
            </header>

            <div className="admin-stats-container">
                <div className="admin-stat-box blue">
                    <p>👥 Total Users</p>
                    <h3>{stats.totalUsers.toLocaleString()}</h3>
                </div>
                <div className="admin-stat-box red">
                    <p>✍️ Verified Writers</p>
                    <h3>{stats.totalWriters.toLocaleString()}</h3>
                </div>
                <div className="admin-stat-box gold">
                    <p>⏳ Pending Approval</p>
                    <h3>{stats.pendingApprovals.toLocaleString()}</h3>
                </div>
                <div className="admin-stat-box green">
                    <p>📚 Total Publications</p>
                    <h3>{stats.totalWorks.toLocaleString()}</h3>
                </div>
            </div>
            
            <div className="admin-pending-tasks">
                <h3>⚠️ Priority Tasks</h3>
                <p>Approval queue requires attention.</p>
                <button 
                    className="action-alert-btn"
                    onClick={() => navigate('/admin/writer-requests')}
                >
                    Review {stats.pendingApprovals} Requests
                </button>
            </div>
        </div>
    );
};

export default AdminMainStats;