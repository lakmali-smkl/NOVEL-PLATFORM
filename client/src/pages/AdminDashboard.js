import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './AdminDashboard.css';
import UserDirectory from './UserDirectory'; 
import AdminMainStats from './AdminMainStats'; 
import WriterRequests from './WriterRequests';
import ContentOversight from './ContentOversight';
import SiteGrowth from './SiteGrowth';
import AdminAnnouncements from './AdminAnnouncements';


const AdminDashboard = () => {
    // Default the application to show your 'dashboard' summary grid first
    const [activeTab, setActiveTab] = useState('dashboard');
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;

        if (path.startsWith('/admin/writer-requests')) {
            setActiveTab('writer-requests');
        } else if (path.startsWith('/admin/manage-users')) {
            setActiveTab('user-directory');
        } else if (path.startsWith('/admin/global-content')) {
            setActiveTab('content-oversight');
        } else if (path.startsWith('/admin/announcements')) {
            setActiveTab('announcements');
        } else if (path.startsWith('/admin/analytics')) {
            setActiveTab('site-growth');
        } else {
            setActiveTab('dashboard');
        }
    }, [location.pathname]);

    const renderMainContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <AdminMainStats setActiveTab={setActiveTab} />;
            case 'user-directory':
                return <UserDirectory />;
            case 'writer-requests':
                return <WriterRequests />;
            case 'content-oversight':
                return <ContentOversight />;
            case 'announcements':
                return <AdminAnnouncements />;
            case 'site-growth':
                return <SiteGrowth />;
            default:
                return <AdminMainStats setActiveTab={setActiveTab} />;
        }
    };

    return (
        
            <main className="admin-main-viewport">
                {renderMainContent()}
            </main>

    );
};

export default AdminDashboard;