import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ChatPage.css';

import { API_BASE_URL, resolveMediaUrl } from '../config';

// Popover that flips from below-the-bubble to above-the-bubble when it would
// otherwise be clipped by the scrollable messages list (e.g. for messages
// near the bottom of the thread, which is the most common case to click).
const FlipPopover = ({ isSent, className, children }) => {
  const ref = useRef(null);
  const [flipUp, setFlipUp] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const container = el.closest('.chat-messages-area');
    if (!container) return;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (elRect.bottom > containerRect.bottom) {
      setFlipUp(true);
    }
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${isSent ? 'align-right' : 'align-left'} ${flipUp ? 'flip-up' : ''}`}
    >
      {children}
    </div>
  );
};

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

  // WhatsApp-style per-message actions
  const [openMenuId, setOpenMenuId] = useState(null);
  const [reactionPickerId, setReactionPickerId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null); // { messageId, text, senderUsername }
  const [forwardingMessage, setForwardingMessage] = useState(null); // full message object
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');
  const [forwardSearchResults, setForwardSearchResults] = useState([]);

  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

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
      const res = await fetch(`${API_BASE_URL}/api/messages/conversations/${userId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
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
      const authHeaders = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const res = await fetch(`${API_BASE_URL}/api/messages/${userId}/${activeConversation._id}`, {
        headers: authHeaders
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
        // Mark as read
        fetch(`${API_BASE_URL}/api/messages/read/${activeConversation._id}/${userId}`, {
          method: 'PUT',
          headers: authHeaders
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

  // Reset per-message UI state (menus, edit/reply drafts) whenever the conversation changes
  useEffect(() => {
    setOpenMenuId(null);
    setReactionPickerId(null);
    setEditingMessageId(null);
    setReplyingTo(null);
    setNewMessage('');
  }, [activeConversation?._id]);

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

  // Send message (or save an edit, if editingMessageId is set)
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || sending) return;

    setSending(true);
    try {
      if (editingMessageId) {
        const res = await fetch(`${API_BASE_URL}/api/messages/${editingMessageId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ text: newMessage.trim() })
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(prev => prev.map(m => m._id === editingMessageId ? data.data : m));
          setEditingMessageId(null);
          setNewMessage('');
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/api/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            senderId: userId,
            receiverId: activeConversation._id,
            text: newMessage.trim(),
            replyTo: replyingTo ? {
              messageId: replyingTo.messageId,
              text: replyingTo.text,
              senderUsername: replyingTo.senderUsername
            } : undefined
          })
        });

        if (res.ok) {
          setNewMessage('');
          setReplyingTo(null);
          fetchMessages();
          fetchConversations();
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Delete a message (sender only)
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m._id !== messageId));
        fetchConversations();
      } else {
        console.error('Failed to delete message:', res.status);
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
    setOpenMenuId(null);
  };

  // Start editing a message — loads its text into the composer
  const handleStartEdit = (msg) => {
    setEditingMessageId(msg._id);
    setNewMessage(msg.text);
    setReplyingTo(null);
    setOpenMenuId(null);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setNewMessage('');
  };

  // Start replying to a message — shows a quoted preview above the composer
  const handleStartReply = (msg) => {
    const isSent = msg.sender === userId;
    setReplyingTo({
      messageId: msg._id,
      text: msg.text,
      senderUsername: isSent ? 'You' : activeConversation.username
    });
    setEditingMessageId(null);
    setOpenMenuId(null);
  };

  // Toggle an emoji reaction on a message
  const handleReact = async (messageId, emoji) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/${messageId}/react`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ emoji })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => prev.map(m => m._id === messageId ? data.data : m));
      }
    } catch (err) {
      console.error('Error reacting to message:', err);
    }
    setReactionPickerId(null);
    setOpenMenuId(null);
  };

  // Forward a message to another conversation
  const handleStartForward = (msg) => {
    setForwardingMessage(msg);
    setOpenMenuId(null);
  };

  const handleForwardSearch = async (query) => {
    setForwardSearchQuery(query);
    if (query.trim().length < 2) {
      setForwardSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}&excludeId=${userId}`);
      const data = await res.json();
      if (res.ok) setForwardSearchResults(data.users || []);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  const sendForward = async (targetUserId) => {
    if (!forwardingMessage) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          receiverId: targetUserId,
          text: forwardingMessage.text,
          forwarded: true
        })
      });
      if (res.ok) {
        if (activeConversation && activeConversation._id === targetUserId) {
          fetchMessages();
        }
        fetchConversations();
      }
    } catch (err) {
      console.error('Error forwarding message:', err);
    }
    setForwardingMessage(null);
    setForwardSearchQuery('');
    setForwardSearchResults([]);
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
                    <img src={resolveMediaUrl(u.profilePicture)} alt="" />
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
                    <img src={resolveMediaUrl(conv.profilePicture)} alt="" />
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
                  <img src={resolveMediaUrl(activeConversation.profilePicture)} alt="" />
                ) : (
                  <span>{activeConversation.username.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="chat-header-info">
                <h3>{activeConversation.username}</h3>
              </div>
            </div>

            {/* Messages */}
            <div
              className="chat-messages-area"
              onClick={() => { setOpenMenuId(null); setReactionPickerId(null); }}
            >
              {messages.length === 0 ? (
                <div className="chat-start-prompt">
                  <span>👋</span>
                  <p>Start a conversation with <strong>{activeConversation.username}</strong></p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isSent = msg.sender === userId;
                  const reactionGroups = (msg.reactions || []).reduce((acc, r) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                    return acc;
                  }, {});
                  const myReaction = (msg.reactions || []).find(r => r.userId === userId)?.emoji;

                  return (
                    <div
                      key={msg._id || idx}
                      className={`chat-bubble-wrap ${isSent ? 'sent' : 'received'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="chat-bubble-col">
                        <div
                          className={`chat-bubble ${isSent ? 'sent' : 'received'}`}
                          onClick={() => setOpenMenuId(prev => prev === msg._id ? null : msg._id)}
                        >
                          {msg.forwarded && <span className="chat-forwarded-tag">↪ Forwarded</span>}
                          {msg.replyTo && msg.replyTo.text && (
                            <div className="chat-reply-quote">
                              <strong>{msg.replyTo.senderUsername}</strong>
                              <span>{msg.replyTo.text}</span>
                            </div>
                          )}
                          <p>{msg.text}</p>
                          <span className="chat-bubble-time">
                            {msg.edited && <span className="chat-edited-tag">edited </span>}
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>

                        {Object.keys(reactionGroups).length > 0 && (
                          <div className={`chat-reactions-row ${isSent ? 'align-right' : 'align-left'}`}>
                            {Object.entries(reactionGroups).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                type="button"
                                className={`chat-reaction-pill ${myReaction === emoji ? 'mine' : ''}`}
                                onClick={() => handleReact(msg._id, emoji)}
                              >
                                {emoji} {count}
                              </button>
                            ))}
                          </div>
                        )}

                        {openMenuId === msg._id && (
                          <FlipPopover isSent={isSent} className="chat-msg-menu">
                            {isSent && (
                              <button type="button" onClick={() => handleStartEdit(msg)}>
                                ✏️ Edit
                              </button>
                            )}
                            {isSent && (
                              <button type="button" onClick={() => handleDeleteMessage(msg._id)}>
                                🗑 Delete
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => { setOpenMenuId(null); setReactionPickerId(msg._id); }}
                            >
                              😀 React
                            </button>
                            <button type="button" onClick={() => handleStartReply(msg)}>
                              ↩️ Reply
                            </button>
                            <button type="button" onClick={() => handleStartForward(msg)}>
                              ➡️ Forward
                            </button>
                          </FlipPopover>
                        )}

                        {reactionPickerId === msg._id && (
                          <FlipPopover isSent={isSent} className="chat-reaction-picker">
                            {REACTION_EMOJIS.map(emoji => (
                              <button key={emoji} type="button" onClick={() => handleReact(msg._id, emoji)}>
                                {emoji}
                              </button>
                            ))}
                          </FlipPopover>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply / Edit preview bar */}
            {replyingTo && (
              <div className="chat-compose-preview">
                <div className="chat-compose-preview-info">
                  <strong>Replying to {replyingTo.senderUsername}</strong>
                  <span>{replyingTo.text}</span>
                </div>
                <button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">✕</button>
              </div>
            )}
            {editingMessageId && (
              <div className="chat-compose-preview">
                <div className="chat-compose-preview-info">
                  <strong>✏️ Editing message</strong>
                </div>
                <button type="button" onClick={cancelEdit} aria-label="Cancel edit">✕</button>
              </div>
            )}

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
                {sending ? '...' : editingMessageId ? '✓' : '➤'}
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

      {/* ── Forward Message Modal ── */}
      {forwardingMessage && (
        <div className="chat-modal-overlay" onClick={() => setForwardingMessage(null)}>
          <div className="chat-forward-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-forward-header">
              <h3>Forward Message</h3>
              <button type="button" onClick={() => setForwardingMessage(null)} aria-label="Close">✕</button>
            </div>
            <p className="chat-forward-preview-text">"{forwardingMessage.text}"</p>
            <input
              type="text"
              placeholder="Search users..."
              value={forwardSearchQuery}
              onChange={(e) => handleForwardSearch(e.target.value)}
              className="chat-search-input"
              autoFocus
            />
            <div className="chat-forward-list">
              {(forwardSearchQuery.trim().length >= 2
                ? forwardSearchResults
                : conversations.map(c => ({ _id: c.userId, username: c.username, profilePicture: c.profilePicture }))
              ).map(u => (
                <button key={u._id} type="button" className="chat-forward-target" onClick={() => sendForward(u._id)}>
                  <div className="chat-conv-avatar">
                    {u.profilePicture ? (
                      <img src={resolveMediaUrl(u.profilePicture)} alt="" />
                    ) : (
                      <span>{u.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <span>{u.username}</span>
                </button>
              ))}
              {forwardSearchQuery.trim().length >= 2 && forwardSearchResults.length === 0 && (
                <div className="chat-forward-empty">No users found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
