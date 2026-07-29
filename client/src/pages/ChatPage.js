import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ChatPage.css';

import { API_BASE_URL } from '../config';
const ChatPage = () => {
  const { username: targetUsername } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user?._id || user?.id;

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null); // { _id, username, profilePicture }
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef(null);
  const messagePollingRef = useRef(null);
  const convPollingRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch conversation list
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/conversations/${userId}`);
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
        // Build unread counts
        const counts = {};
        (data.conversations || []).forEach(conv => {
          if (conv.unreadCount > 0) counts[conv.userId] = conv.unreadCount;
        });
        setUnreadCounts(counts);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async () => {
    if (!userId || !activeConversation) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/${userId}/${activeConversation._id}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
        // Mark as read
        fetch(`${API_BASE_URL}/api/messages/read/${activeConversation._id}/${userId}`, {
          method: 'PUT'
        });
        // Clear unread count for this conversation
        setUnreadCounts(prev => {
          const updated = { ...prev };
          delete updated[activeConversation._id];
          return updated;
        });
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [userId, activeConversation]);

  // Initial load
  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    fetchConversations();
  }, [userId, navigate, fetchConversations]);

  // Handle URL-based target username (e.g., /chat/writerName)
  useEffect(() => {
    if (targetUsername && userId) {
      // Look up user by username
      const initChat = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/users/by-username/${targetUsername}`);
          const data = await res.json();
          if (res.ok && data.user) {
            setActiveConversation({
              _id: data.user._id,
              username: data.user.username,
              profilePicture: data.user.profilePicture || ''
            });
            setMobileShowChat(true);
          }
        } catch (err) {
          console.error('Error looking up user:', err);
        }
      };
      initChat();
    }
  }, [targetUsername, userId]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages();
    }
  }, [activeConversation, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Polling: refresh conversations every 8s, messages every 5s
  useEffect(() => {
    convPollingRef.current = setInterval(fetchConversations, 8000);
    return () => clearInterval(convPollingRef.current);
  }, [fetchConversations]);

  useEffect(() => {
    if (activeConversation) {
      messagePollingRef.current = setInterval(fetchMessages, 5000);
      return () => clearInterval(messagePollingRef.current);
    }
  }, [activeConversation, fetchMessages]);

  // Send message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || sending) return;

    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: userId,
          receiverId: activeConversation._id,
          text: newMessage.trim()
        })
      });

      if (res.ok) {
        setNewMessage('');
        fetchMessages();
        fetchConversations();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Search for users to start new chat
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}&excludeId=${userId}`);
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  const startConversation = (targetUser) => {
    setActiveConversation({
      _id: targetUser._id,
      username: targetUser.username,
      profilePicture: targetUser.profilePicture || ''
    });
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setMobileShowChat(true);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString();
  };

  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  if (!userId) return null;

  return (
    <div className="chat-page">
      {/* ── Conversation Sidebar ── */}
      <div className={`chat-sidebar ${mobileShowChat ? 'mobile-hidden' : ''}`}>
        <div className="chat-sidebar-header">
          <h2>💬 Messages {totalUnread > 0 && <span className="total-unread-badge">{totalUnread}</span>}</h2>
        </div>

        {/* Search bar */}
        <div className="chat-search-wrap">
          <input
            type="text"
            placeholder="Search users to chat..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="chat-search-input"
          />
        </div>

        {/* Search results */}
        {isSearching && searchResults.length > 0 && (
          <div className="chat-search-results">
            {searchResults.map(u => (
              <button key={u._id} className="chat-conv-item search-result" onClick={() => startConversation(u)}>
                <div className="chat-conv-avatar">
                  {u.profilePicture ? (
                    <img src={`${API_BASE_URL}/${u.profilePicture}`} alt="" />
                  ) : (
                    <span>{u.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="chat-conv-info">
                  <span className="chat-conv-name">{u.username}</span>
                  <span className="chat-conv-hint">Click to start chat</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Conversation list */}
        <div className="chat-conv-list">
          {loading ? (
            <div className="chat-empty-state">Loading conversations...</div>
          ) : conversations.length === 0 && !isSearching ? (
            <div className="chat-empty-state">
              <span className="empty-icon">💬</span>
              <p>No conversations yet</p>
              <small>Search for a user above to start chatting</small>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.userId}
                className={`chat-conv-item ${activeConversation?._id === conv.userId ? 'active' : ''}`}
                onClick={() => {
                  setActiveConversation({
                    _id: conv.userId,
                    username: conv.username,
                    profilePicture: conv.profilePicture || ''
                  });
                  setMobileShowChat(true);
                }}
              >
                <div className="chat-conv-avatar">
                  {conv.profilePicture ? (
                    <img src={`${API_BASE_URL}/${conv.profilePicture}`} alt="" />
                  ) : (
                    <span>{conv.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="chat-conv-info">
                  <div className="chat-conv-top">
                    <span className="chat-conv-name">{conv.username}</span>
                    <span className="chat-conv-time">{formatTime(conv.lastMessageAt)}</span>
                  </div>
                  <div className="chat-conv-bottom">
                    <span className="chat-conv-preview">{conv.lastMessage}</span>
                    {unreadCounts[conv.userId] > 0 && (
                      <span className="chat-unread-badge">{unreadCounts[conv.userId]}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat Main Area ── */}
      <div className={`chat-main ${mobileShowChat ? 'mobile-visible' : ''}`}>
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div className="chat-header-bar">
              <button className="chat-back-btn" onClick={() => setMobileShowChat(false)}>
                ← 
              </button>
              <div className="chat-header-avatar">
                {activeConversation.profilePicture ? (
                  <img src={`${API_BASE_URL}/${activeConversation.profilePicture}`} alt="" />
                ) : (
                  <span>{activeConversation.username.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="chat-header-info">
                <h3>{activeConversation.username}</h3>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages-area">
              {messages.length === 0 ? (
                <div className="chat-start-prompt">
                  <span>👋</span>
                  <p>Start a conversation with <strong>{activeConversation.username}</strong></p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isSent = msg.sender === userId;
                  return (
                    <div key={msg._id || idx} className={`chat-bubble-wrap ${isSent ? 'sent' : 'received'}`}>
                      <div className={`chat-bubble ${isSent ? 'sent' : 'received'}`}>
                        <p>{msg.text}</p>
                        <span className="chat-bubble-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className="chat-input-area" onSubmit={handleSend}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message ${activeConversation.username}...`}
                className="chat-input"
                autoFocus
              />
              <button 
                type="submit" 
                className="chat-send-btn" 
                disabled={!newMessage.trim() || sending}
              >
                {sending ? '...' : '➤'}
              </button>
            </form>
          </>
        ) : (
          <div className="chat-no-selection">
            <span className="chat-no-icon">💬</span>
            <h3>Select a conversation</h3>
            <p>Choose a chat from the sidebar or search for a user to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
