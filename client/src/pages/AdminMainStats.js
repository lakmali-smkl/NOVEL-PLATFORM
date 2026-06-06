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

    const handlePostAnnouncement = async () => {
        const title = prompt("📢 Announcement Title (e.g., System Update):");
        const message = prompt("📝 Message for the users:");
        
        if (title && message) {
            try {
                const response = await fetch('http://localhost:5000/api/admin/announcements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, message, type: 'priority' })
                });
                if (response.ok) {
                    alert("🚀 Announcement is now live on all user dashboards!");
                } else {
                    alert("❌ Failed to post. Check server connection.");
                }
            } catch (err) {
                console.error("Announcement Error:", err);
            }
        }
    };

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
            
            <div className="admin-split-view">
                <div className="admin-recent-users">
                    <h3>🛡️ Platform Management</h3>
                    <p>Broadcasting tools and system health.</p>
                    
                    <button className="admin-action-secondary" onClick={handlePostAnnouncement}>
                        Create Site Announcement
                    </button>

                    <div style={{marginTop: '20px', color: '#555'}}>
                        System status: <span style={{color: '#2ecc71'}}>Optimal</span>
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
        </div>
    );
};

export default AdminMainStats;