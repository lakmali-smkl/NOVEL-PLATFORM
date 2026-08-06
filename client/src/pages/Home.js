import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom'; 
import './Home.css';
import myVideo from './backgroundVideo.mp4';
import RecommendationSection from './RecommendationSection';
import ChatbotWidget from '../components/ChatbotWidget';

import { API_BASE_URL } from '../config';
const literaryQuotes = [
  { text: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin" },
  { text: "There is no barrier, obstacle, or limitation that can be placed on a mind that loves stories.", author: "Unknown" },
  { text: "You can make anything by writing.", author: "C.S. Lewis" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King" },
  { text: "The purpose of a writer is to keep civilization from destroying itself.", author: "Albert Camus" },
  { text: "There is no greater agony than bearing an untold story inside you.", author: "Maya Angelou" }
];

const Home = ({ user }) => {
  const [trending, setTrending] = useState([]);
  const [allNovels, setAllNovels] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({ favoritesCount: 0, historyCount: 0, collectionsCount: 0 });
  const [readingStats, setReadingStats] = useState({
    streak: 0,
    weeklyGoal: 5,
    daysReadThisWeek: 0,
    progressPercentage: 0,
    dayChecklist: [false, false, false, false, false, false, false]
  });
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [currentQuoteIdx, setCurrentQuoteIdx] = useState(0);
  const [faqOpen, setFaqOpen] = useState({});

  useEffect(() => {
    // Fetch all novels for guest view trending and logged-in genre explorer
    fetch(`${API_BASE_URL}/api/novels`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllNovels(data);
          setTrending(data.slice(0, 3));
        }
      })
      .catch(err => console.error("Error loading novels:", err));

    if (user) {
      const userId = user._id || user.id;
      const authHeaders = { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } };

      // Fetch Reading Stats
      fetch(`${API_BASE_URL}/api/users/${userId}/reading-stats`, authHeaders)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setReadingStats(data);
          }
        })
        .catch(err => console.error("Error loading reading stats:", err));

      fetch(`${API_BASE_URL}/api/announcements`)
        .then(res => {
          if (!res.ok) throw new Error("Route not found on server");
          return res.json();
        })
        .then(data => setAnnouncements(data))
        .catch(err => console.error("Error loading announcements:", err));

      // Favorites Count
      if (user.favorites) {
        setStats(prev => ({ ...prev, favoritesCount: user.favorites.length }));
      }

      // Collections Count
      fetch(`${API_BASE_URL}/api/collections/${userId}`, authHeaders)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setStats(prev => ({ ...prev, collectionsCount: data.length }));
          }
        })
        .catch(() => {});

      // History
      fetch(`${API_BASE_URL}/api/users/${userId}/history`, authHeaders)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setRecentHistory(data.slice(0, 3));
            setStats(prev => ({ ...prev, historyCount: data.length }));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const toggleFaq = (index) => {
    setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const nextQuote = () => {
    setCurrentQuoteIdx((prev) => (prev + 1) % literaryQuotes.length);
  };

  if (user && user.isAdmin) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  if (user && user.isWriter) {
    return <Navigate to="/writer-dashboard" replace />;
  }

  const genres = ['All', 'Fantasy', 'Romance', 'Sci-Fi', 'Thriller', 'Mystery', 'Adventure', 'Horror', 'Drama'];

  const filteredNovels = selectedGenre === 'All'
    ? allNovels
    : allNovels.filter(novel => (novel.genre || '').toLowerCase() === selectedGenre.toLowerCase());

  // --- VIEW 1: Logged In (Discovery) ---
  if (user) {
    return (
      <div className="home-container logged-in-view">
        <header className="welcome-banner">
          <h1>Welcome back, <span>{user.username}</span>!</h1>
          <p>Ready to discover something new today?</p>
        </header>

        {announcements.length > 0 && (
          <div className="announcement-wrapper">
            {announcements.map((ann) => (
              <div key={ann._id} className="ann-terminal-card">
                <div className="ann-scanline"></div>
                
                <div className="ann-indicator-rail">
                  <div className="ann-status-pulse"></div>
                  <div className="ann-rail-line"></div>
                </div>

                <div className="ann-main-body">
                  <div className="ann-meta-row">
                    <div className="ann-tag">
                      <span className="ann-tag-dot"></span>
                      Announcement
                    </div>
                    <div className="ann-timestamp">
                      {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(ann.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <h4 className="ann-headline">{ann.title}</h4>
                  <p className="ann-text">{ann.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 🕒 Continue Reading Section */}
        {recentHistory.length > 0 && (
          <section className="continue-reading-section">
            <h2 className="section-title">🕒 Continue Reading</h2>
            <div className="continue-reading-grid">
              {recentHistory.map((item) => (
                <div key={item.contentId} className="continue-card">
                  <div className="continue-cover-wrapper">
                    {item.coverPhoto ? (
                      <img src={`${API_BASE_URL}/${item.coverPhoto}`} alt={item.title} />
                    ) : (
                      <div className="continue-cover-placeholder">📖</div>
                    )}
                    <span className="continue-type-badge">{item.type}</span>
                  </div>
                  <div className="continue-info">
                    <h3>{item.title}</h3>
                    <p className="continue-timestamp">
                      Last read: {new Date(item.lastRead).toLocaleDateString()}
                    </p>
                    <Link to={`/read/${item.type}/${item.contentId}`} className="resume-btn">
                      Resume Story
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ✨ AI Recommendation Engine */}
        <RecommendationSection user={user} />

        {/* 📊 Home Stats Cards */}
        <div className="home-stats-dashboard">
          <Link to="/dashboard/favorites" className="home-stat-card">
            <div className="home-stat-icon">❤️</div>
            <div className="home-stat-info">
              <span className="home-stat-number">{stats.favoritesCount}</span>
              <span className="home-stat-label">Favorites</span>
            </div>
          </Link>
          <Link to="/dashboard/read-later" className="home-stat-card">
            <div className="home-stat-icon">🔖</div>
            <div className="home-stat-info">
              <span className="home-stat-number">{stats.collectionsCount}</span>
              <span className="home-stat-label">Collections</span>
            </div>
          </Link>
          <Link to="/dashboard/history" className="home-stat-card">
            <div className="home-stat-icon">🕒</div>
            <div className="home-stat-info">
              <span className="home-stat-number">{stats.historyCount}</span>
              <span className="home-stat-label">Read Stories</span>
            </div>
          </Link>
        </div>

        {/* Two-Column Section: Streak Activity & Inspirational Quote */}
        <div className="home-dashboard-grid">
          {/* 🔥 Reading Activity & Goals Widget */}
          <div className="home-info-card">
            <h3>🔥 Reading Activity & Goals</h3>
            <div className="home-streak-widget">
              <div className="home-streak-main">
                <span className="home-streak-fire">⚡</span>
                <div className="home-streak-txt">
                  <span className="home-streak-num">
                    {readingStats.streak} {readingStats.streak === 1 ? 'Day' : 'Days'}
                  </span>
                  <span className="home-streak-sub">Active Streak</span>
                </div>
              </div>
              <div className="home-streak-ring-box">
                <div className="home-progress-ring-wrap">
                  <svg className="home-progress-svg" viewBox="0 0 36 36">
                    <path className="home-progress-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="home-progress-bar" strokeDasharray={`${readingStats.progressPercentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="home-progress-percentage">{readingStats.progressPercentage}%</div>
                </div>
                <div className="home-ring-label">
                  <strong>{readingStats.daysReadThisWeek} of {readingStats.weeklyGoal}</strong>
                  <span>Weekly Goal</span>
                </div>
              </div>
            </div>
            
            <div className="home-daily-checklist">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayChar, i) => {
                const checked = readingStats.dayChecklist[i];
                return (
                  <div key={i} className={`home-day-box ${checked ? 'checked' : ''}`}>
                    <span>{dayChar}</span>
                    <span className="home-check-dot">{checked ? '✓' : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ✍️ Daily Quote Widget */}
          <div className="home-info-card quote-widget">
            <h3>📖 Quote of the Day</h3>
            <div className="quote-content">
              <span className="quote-mark">“</span>
              <p className="quote-text">{literaryQuotes[currentQuoteIdx].text}</p>
              <p className="quote-author">— {literaryQuotes[currentQuoteIdx].author}</p>
            </div>
            <button className="quote-btn" onClick={nextQuote}>
              Next Inspiration 🌟
            </button>
          </div>
        </div>



        {/* 🔥 Trending Section */}
        <section className="trending-section">
          <h2 className="section-title">🔥 Trending Now</h2>
          <div className="trending-grid">
            {trending.length > 0 ? (
              trending.map(item => (
                <div key={item._id} className="novel-card">
                  <img src={`${API_BASE_URL}/${item.coverPhoto}`} alt={item.title} />
                  <h3>{item.title}</h3>
                  <Link to={`/read/novel/${item._id}`} className="read-now-btn">Read Now</Link>
                </div>
              ))
            ) : (
              <p>Loading your library...</p>
            )}
          </div>
        </section>

        {/* 📚 Genre Selector Section */}
        <section className="genre-explorer-section">
          <h2 className="section-title">📚 Explore Library by Genre</h2>
          <div className="genre-tabs-container">
            {genres.map(genre => (
              <button 
                key={genre} 
                className={`genre-tab-btn ${selectedGenre === genre ? 'active' : ''}`}
                onClick={() => setSelectedGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>

          <div className="genre-novels-grid">
            {filteredNovels.length > 0 ? (
              filteredNovels.map(novel => (
                <div key={novel._id} className="genre-novel-card">
                  <div className="genre-novel-cover">
                    {novel.coverPhoto ? (
                      <img src={`${API_BASE_URL}/${novel.coverPhoto}`} alt={novel.title} />
                    ) : (
                      <div className="genre-cover-placeholder">📚</div>
                    )}
                    <span className="genre-badge">{novel.genre || 'Other'}</span>
                  </div>
                  <div className="genre-novel-info">
                    <h3>{novel.title}</h3>
                    <p className="genre-novel-author">By {novel.author}</p>
                    <p className="genre-novel-desc">
                      {novel.content ? `${novel.content.substring(0, 80)}...` : 'No summary details available.'}
                    </p>
                    <Link to={`/read/novel/${novel._id}`} className="genre-read-btn">
                      Read Story
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="genre-empty-state">
                <p>No stories published in <strong>{selectedGenre}</strong> yet. Check back soon!</p>
              </div>
            )}
          </div>
        </section>

        {/* 🤖 Floating Library Helper Chatbot */}
        <ChatbotWidget />
      </div>
    );
  }

  // --- VIEW 2: Guest (Landing Page) ---
  return (
    <div className="home-container guest-view">
      <div className="hero-section">
        <video autoPlay loop muted playsInline className="video-background">
          <source src={myVideo} type="video/mp4" />
        </video>
        
        {/* Top Fold Hero Overlay */}
        <section className="hero-overlay">
          <div className="hero-glass-card">
            <h1>Welcome to <span>Lumiverse</span></h1>
            <p>Explore, read, write, and share your favorite stories with a community of readers and creators.</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn-red">Sign Up</Link>
              <Link to="/login" className="btn-red">Login</Link>
            </div>
          </div>
        </section>
      </div>


      {/* Scroll Content Below the Fold */}
      <div className="guest-scroll-content">
        
        {/* Features Showcase */}
        <section className="guest-section guest-features-section">
          <h2 className="guest-section-title">Redefining the Creative Publishing Experience</h2>
          <p className="guest-section-subtitle">Whether you're a reader seeking your next favorite piece or a creator sharing your first work, we build the bridges.</p>
          
          <div className="guest-features-grid">
            <div className="feature-card-premium">
              <div className="feature-icon">🧠</div>
              <h3>AI Recommendation</h3>
              <p>Discover hand-picked stories matching your tastes perfectly using our custom matching engine.</p>
            </div>
            
            <div className="feature-card-premium">
              <div className="feature-icon">💬</div>
              <h3>Live Creator Chats</h3>
              <p>Direct communication channels between writers and their audiences for instant feedback loops.</p>
            </div>
            
            <div className="feature-card-premium">
              <div className="feature-icon">🔥</div>
              <h3>Reading Milestones</h3>
              <p>Earn streak logs, track read counts, and challenge yourself with daily and weekly milestones.</p>
            </div>
          </div>
        </section>

        {/* Trending Preview Section */}
        <section className="guest-section guest-trending-preview">
          <h2 className="guest-section-title">Popular On The Platform</h2>
          <p className="guest-section-subtitle">Get a glimpse of the stories captivating readers today. Sign up to unlock full libraries.</p>
          
          <div className="guest-trending-grid">
            {trending.length > 0 ? (
              trending.map(item => (
                <div key={item._id} className="guest-preview-card">
                  <div className="guest-preview-cover">
                    {item.coverPhoto ? (
                      <img src={`${API_BASE_URL}/${item.coverPhoto}`} alt={item.title} />
                    ) : (
                      <div className="placeholder-art">📖</div>
                    )}
                  </div>
                  <div className="guest-preview-body">
                    <h3>{item.title}</h3>
                    <p className="guest-preview-author">By {item.author}</p>
                    <p className="guest-preview-snippet">
                      {item.content ? `${item.content.substring(0, 90)}...` : 'Join us to uncover the story.'}
                    </p>
                    <Link to="/register" className="guest-preview-btn">Register to Read</Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="loading-preview">Loading trending stories...</div>
            )}
          </div>
        </section>

        {/* Creator Call to Action Banner */}
        <section className="guest-section guest-writer-banner">
          <div className="writer-banner-glow"></div>
          <div className="writer-banner-content">
            <span className="banner-eyebrow">CREATOR PORTAL</span>
            <h2>Are You a Creator?</h2>
            <p>Publish your creative work, track live readership metrics, interact with fans, and join a thriving community of writers. Apply for a writer account inside your profile dashboard.</p>
            <Link to="/register" className="btn-red writer-cta-btn">Join as Creator</Link>
          </div>
        </section>

        {/* Testimonials */}
        <section className="guest-section guest-testimonials">
          <h2 className="guest-section-title">Reader & Writer Testimonials</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <p className="testimonial-quote">"The reading streak ring makes me read every day. The UI looks incredibly futuristic and smooth!"</p>
              <div className="testimonial-user">
                <span className="user-avatar">🧑</span>
                <div>
                  <strong>Alex Mercer</strong>
                  <span>Avid Reader</span>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <p className="testimonial-quote">"As an author, writing chapters and checking my metrics is simple. The live chat allows me to coordinate with my readers."</p>
              <div className="testimonial-user">
                <span className="user-avatar">✍️</span>
                <div>
                  <strong>Elena Vane</strong>
                  <span>Sci-Fi Writer</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section className="guest-section guest-faq-section">
          <h2 className="guest-section-title">Frequently Asked Questions</h2>
          <p className="guest-section-subtitle">Everything you need to know about the platform.</p>
          
          <div className="faq-accordion-container">
            {[
              {
                q: "Is Lumiverse free to read?",
                a: "Absolutely! Reading published works, setting goals, tracking reading history, and talking to creators is entirely free."
              },
              {
                q: "How do I start publishing my own stories?",
                a: "Register a regular account, then click 'Request Writer Role' from your account settings inside the dashboard. Once approved by our admins, your writer dashboard will unlock instantly!"
              },
              {
                q: "What options are available for readers?",
                a: "Readers can save stories to favorites, build customized 'Read Later' collections, track reading streaks, and use the AI bot helper."
              },
              {
                q: "Is there a desktop and mobile support?",
                a: "Yes. Our platform is completely responsive and optimized for screen sizes ranging from large monitors down to small smartphones."
              }
            ].map((faq, index) => (
              <div key={index} className={`faq-card ${faqOpen[index] ? 'open' : ''}`} onClick={() => toggleFaq(index)}>
                <div className="faq-question-header">
                  <h3>{faq.q}</h3>
                  <span className="faq-arrow">{faqOpen[index] ? '▼' : '▶'}</span>
                </div>
                {faqOpen[index] && (
                  <div className="faq-answer-body">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 🤖 Floating Library Helper Chatbot - also on landing page for guests */}
      <ChatbotWidget />
    </div>
  );
};

export default Home;