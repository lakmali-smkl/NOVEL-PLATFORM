import React from 'react';
import './WriterWelcome.css';

const WriterWelcome = ({ onConfirm }) => {
    return (
        <div className="welcome-overlay">
            <div className="welcome-modal">
                <div className="welcome-icon">✍️</div>
                <span className="welcome-tag">OFFICIAL WRITER</span>
                <h2>Welcome to the Creator Studio</h2>
                <p>Your application was approved! You now have the power to publish novels, manage articles, and build your own audience.</p>
                
                <button className="welcome-btn" onClick={onConfirm}>
                    Let's Start Writing
                </button>
            </div>
        </div>
    );
};

export default WriterWelcome;