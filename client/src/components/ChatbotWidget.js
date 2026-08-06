import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ChatbotWidget.css';

import { API_BASE_URL } from '../config';
const QUICK_PROMPTS = [
  { text: '📚 Suggest a story', label: 'Suggest' },
  { text: '✍️ How to write?', label: 'Writer' },
  { text: '🎨 Change themes', label: 'Theme' },
  { text: '💬 How to message authors?', label: 'Chat' },
];

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your Library Helper chatbot. 🤖\n\nHow can I help you find stories or navigate the platform today?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/bot/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: data.reply,
            suggestions: data.suggestions || [],
            timestamp: new Date(),
          },
        ]);
      } else {
        throw new Error('Server error');
      }
    } catch (err) {
      // Local fallback — matches same logic as server, works when offline
      const m = textToSend.toLowerCase();
      const has = (...kws) => kws.some(k => m.includes(k));
      let fallbackReply = '';

      if (has('hi', 'hello', 'hey', 'hola', 'good morning', 'good evening', 'howdy', 'sup')) {
        fallbackReply = "Hello! 👋 I'm your Library Helper chatbot.\n\nI can help you:\n📚 Find stories to read\n✍️ Learn how to write & publish\n🎨 Change your theme\n❤️ Save favorites\n💬 Message authors\n🔑 Account & login help\n\nWhat would you like to know?";
      } else if (has('suggest', 'recommend', 'what should i read', 'good book', 'good novel', 'popular', 'best novel', 'best story')) {
        fallbackReply = "Great choice! 📚\n\nTo find the best stories:\n1. Check '🔥 Trending Now' on the home page\n2. See '✨ AI Recommendations' on your dashboard\n3. Browse the Library in the sidebar\n4. Ask me 'show me library' for live picks!";
      } else if (has('browse', 'explore', 'library', 'discover', 'catalog', 'what can i read')) {
        fallbackReply = "Explore our growing library! 🏛️\n\nWays to find stories:\n1. Sidebar → 'Library' to browse all content\n2. Filter by genre, type (story/article) or author\n3. Use the search bar for specific titles\n4. '🔥 Trending Now' shows the most-viewed stories";
      } else if (has('genre', 'fantasy', 'romance', 'thriller', 'mystery', 'sci-fi', 'horror', 'adventure', 'comedy', 'drama')) {
        fallbackReply = "We support many genres! 🎭\n\nAvailable genres:\n📖 Fantasy  •  💕 Romance  •  🔍 Mystery\n🚀 Sci-Fi  •  😱 Horror  •  ⚔️ Adventure\n😂 Comedy  •  🎭 Drama  •  🏛️ Historical\n\nFilter by genre in the Library section of the sidebar!";
      } else if (has('become a writer', 'how to write', 'want to write', 'start writing', 'apply writer', 'can i publish', 'write a novel')) {
        fallbackReply = "Becoming a writer is easy! ✍️\n\nSteps:\n1. Go to your Reader Portal (home page)\n2. Open sidebar → click '✍️ Become a Writer'\n3. Submit your application\n4. Wait for Admin approval\n5. Access the 'Writer Portal' once approved\n\nIn Writer Portal you can publish stories, articles & more!";
      } else if (has('writer', 'publish', 'write', 'chapter', 'upload')) {
        fallbackReply = "The Writer Portal is your creative hub! 🖊️\n\nFrom Writer Portal you can:\n📖 Create stories with multiple chapters\n📝 Write & publish articles\n📊 View analytics (views, likes, comments)\n💬 Engage with reader comments\n📢 Post announcements\n\nApply from the Reader sidebar to get started!";
      } else if (has('comment', 'review', 'rate', 'rating', 'feedback', 'reply to comment')) {
        fallbackReply = "Interacting with stories is easy! 💬\n\nTo leave a comment:\n1. Open any chapter or article\n2. Scroll to the bottom\n3. Type and click 'Post'\n\nYou can also:\n↩️ Reply to other readers\n❤️ Like stories\n🗑️ Delete your own comments anytime";
      } else if (has('like', 'favorite', 'favourit', 'save story', 'bookmark', 'saved', 'heart')) {
        fallbackReply = "Saving stories is simple! ❤️\n\nTo Favorite:\n• Click the ❤️ heart button on any story page\n\nTo view Favorites:\n• Sidebar → 'Favorites'\n• Filter by All / Stories / Articles\n\nTo organize:\n• Click '+ Add to Collection' on any story\n• Create custom named reading shelves";
      } else if (has('collection', 'shelf', 'organize', 'folder', 'reading list', 'read later')) {
        fallbackReply = "Collections keep you organized! 📁\n\nHow to use:\n1. Open any story page\n2. Click 'Add to Collection'\n3. Create a new shelf or add to existing\n\nFind your collections:\n• Sidebar → 'Library' → 'Collections'";
      } else if (has('history', 'reading history', 'continue reading', 'last read', 'resume')) {
        fallbackReply = "Your reading progress is saved automatically! 📖\n\nTo access History:\n• Sidebar → 'Reading History'\n\nYou'll see:\n🕒 Recently read stories\n📄 Chapter you last read\n\nClick any item to jump right back in!";
      } else if (has('login', 'sign in', 'log in', 'cant login', 'login problem', 'forgot login')) {
        fallbackReply = "Having trouble logging in? 🔑\n\nTry these:\n1. Check username & password are correct\n2. Check if CAPS LOCK is on\n3. Contact admin if you forgot your password\n\nTo log in:\n• Home page → click 'Login'\n• Enter username + password → 'Login'\n\nNew here? Click 'Sign Up' for a free account!";
      } else if (has('register', 'sign up', 'signup', 'create account', 'join', 'get started', 'new account')) {
        fallbackReply = "Creating an account is free & instant! 🎉\n\nTo register:\n1. Click 'Sign Up' on the home page\n2. Choose a unique username\n3. Enter your email & password\n4. Click 'Register'\n\nThen you can read, save favorites, comment & apply to write!";
      } else if (has('profile', 'account', 'setting', 'change password', 'edit profile', 'my account')) {
        fallbackReply = "Manage your account easily! ⚙️\n\nTo open Settings:\n• Sidebar → 'Settings'\n\nIn Settings you can:\n👤 Edit your profile info\n🔒 Change your password\n🎨 Switch platform theme\n🔔 Manage notifications";
      } else if (has('theme', 'color', 'dark mode', 'light mode', 'appearance', 'midnight', 'ocean', 'forest', 'purple', 'sunset', 'snow')) {
        fallbackReply = "We have 6 stunning themes! 🎨\n\n🌑 Midnight — Deep dark mode\n❄️ Snow — Clean light mode\n🌊 Ocean — Cool blue tones\n🌲 Forest — Natural green tones\n💜 Purple — Rich purple accents\n🌅 Sunset — Warm orange/red tones\n\nSwitch themes:\n• Color dot in top-right navbar\n• Settings → Appearance";
      } else if (has('message', 'chat', 'dm', 'direct message', 'contact writer', 'message author', 'inbox', 'conversation')) {
        fallbackReply = "Chat with any writer directly! 💬\n\nTo message a writer:\n1. Open any of their stories\n2. Click '💬 Message Writer' near their name\n\nTo view all chats:\n• Sidebar → 'Messages'\n• See unread counts & switch conversations";
      } else if (has('announcement', 'news', 'update', 'notification', 'notice')) {
        fallbackReply = "Stay updated with announcements! 📢\n\nAnnouncements appear:\n• On your home dashboard at the top\n• Writers post announcements for their readers\n• Admins post platform-wide news\n\nCheck the home page regularly!";
      } else if (has('admin', 'report', 'abuse', 'inappropriate', 'content policy', 'moderate')) {
        fallbackReply = "For content concerns: 🛡️\n\nPlatform rules:\n• All content is reviewed by admins\n• Inappropriate content can be reported\n• Writers must follow community guidelines\n\nContact the platform admin for serious concerns.";
      } else if (has('search', 'find', 'look for', 'look up', 'query')) {
        fallbackReply = "Finding stories is easy! 🔍\n\nWays to search:\n1. Search bar at the top of the Library\n2. Filter by genre, type, or date\n3. '🔥 Trending Now' on home page\n4. '✨ AI Recommendations' on dashboard\n5. Ask me: 'Suggest a story'!";
      } else if (has('what is this', 'about', 'platform', 'this site', 'features', 'how does this work')) {
        fallbackReply = "Welcome to Lumiverse! 📖✨\n\nA community reading & writing platform where:\n\n👀 Readers can:\n• Read stories & articles\n• Save favorites & collections\n• Comment & like stories\n• Get AI recommendations\n\n✍️ Writers can:\n• Publish stories & articles\n• Track engagement analytics\n• Chat with readers\n• Post announcements";
      } else if (has('thank', 'thanks', 'great', 'awesome', 'perfect', 'nice', 'helpful')) {
        fallbackReply = "You're very welcome! 😊\n\nHappy reading! I'm always here if you need help. Enjoy exploring the library! 📚✨";
      } else if (has('bye', 'goodbye', 'see you', 'later', 'cya')) {
        fallbackReply = "Goodbye! 👋 Happy reading! Come back anytime. The library awaits! 📚";
      } else {
        fallbackReply = `I'm not sure I understood that, but I'm happy to help! 🤖\n\nTry asking:\n📚 "Suggest a story to read"\n✍️ "How do I become a writer?"\n🎨 "How do I change my theme?"\n❤️ "How do I save a favorite?"\n💬 "How to message an author?"\n🔑 "Login help"\n📖 "What is this site about?"\n\nOr use the quick buttons below!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: fallbackReply,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bot-widget-container ${isOpen ? 'active' : ''}`}>
      {/* Floating Action Button */}
      <button className="bot-fab-btn" onClick={() => setIsOpen(!isOpen)} title="Ask Library Helper">
        <span className="bot-fab-icon">{isOpen ? '✖' : '🤖'}</span>
        {!isOpen && <span className="bot-badge-ping" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="bot-chat-window">
          <div className="bot-header">
            <div className="bot-header-info">
              <span className="bot-avatar-icon">🤖</span>
              <div>
                <h4>Library Helper</h4>
                <p>Online AI Assistant</p>
              </div>
            </div>
            <button className="bot-close-btn" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>

          <div className="bot-messages-area">
            {messages.map((msg, idx) => (
              <div key={idx} className={`bot-bubble-wrapper ${msg.sender}`}>
                <div className={`bot-bubble ${msg.sender}`}>
                  <p style={{ whiteSpace: 'pre-line' }}>{msg.text}</p>
                  
                  {/* Suggestions rendering */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="bot-suggestions-list">
                      {msg.suggestions.map((item) => (
                        <Link
                          to={`/read/${item.type}/${item._id}`}
                          key={item._id}
                          className="bot-suggestion-link"
                          onClick={() => setIsOpen(false)} // Auto close bot on click to read
                        >
                          <span className="bs-icon">{item.type === 'novel' ? '📖' : '📝'}</span>
                          <div className="bs-meta">
                            <span className="bs-title">{item.title}</span>
                            <span className="bs-author">by {item.author}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="bot-bubble-wrapper bot">
                <div className="bot-bubble bot typing">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick options panel */}
          <div className="bot-quick-panel">
            {QUICK_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                className="bot-quick-btn"
                onClick={() => handleSendMessage(prompt.text)}
                disabled={isLoading}
              >
                {prompt.text}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form
            className="bot-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about the site..."
              className="bot-input-field"
              disabled={isLoading}
            />
            <button type="submit" className="bot-send-btn" disabled={!inputValue.trim() || isLoading}>
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
