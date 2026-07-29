import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css'; // Shares the same premium stylesheet

const HINT_OPTIONS = [
  "What's your spirit animal?",
  "If you were a potato, what kind?",
  "What's your go-to karaoke song?",
  "Name of your imaginary childhood friend?",
  "What was your weirdest haircut?",
  "If you had a robot butler, what would you name it?",
  "What's the weirdest thing you've ever eaten?",
  "What's your favorite lazy Sunday activity?",
  "If you could teleport, where's the first place you'd go?",
  "What's the name of your first stuffed animal?"
];

// Password strength helper
const getPasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: '', color: '' },
    { label: 'Weak', color: '#ef4444' },
    { label: 'Fair', color: '#f97316' },
    { label: 'Good', color: '#eab308' },
    { label: 'Strong', color: '#22c55e' },
    { label: 'Very Strong', color: '#10b981' },
  ];
  return { score, ...map[score] };
};

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hintQuestion, setHintQuestion] = useState(HINT_OPTIONS[0]);
  const [hintAnswer, setHintAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();
  const strength = getPasswordStrength(password);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!hintAnswer.trim()) {
      setError('Please provide an answer to your security question.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, hintQuestion, hintAnswer })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Account created! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1800);
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch {
      setError('Cannot connect to server. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Background orbs */}
      <div className="auth-bg-orb orb-1" />
      <div className="auth-bg-orb orb-2" />
      <div className="auth-bg-orb orb-3" />

      <div className="auth-shell auth-shell-wide">
        {/* ── Branding side panel ── */}
        <div className="auth-side-panel">
          <div className="auth-side-blob blob-1" />
          <div className="auth-side-blob blob-2" />
          <div className="auth-side-top">
            <Link to="/" className="auth-side-brand">
              <span className="auth-brand-icon">📖</span>
              <span>NovelVerse</span>
            </Link>
            <h2 className="auth-side-headline">Join a community of readers &amp; writers.</h2>
            <p className="auth-side-sub">Create a free account to build your library, follow your favorite authors, and start your own reading streak.</p>
          </div>
          <ul className="auth-side-features">
            <li><span className="auth-side-feature-icon">🧠</span> AI-matched story recommendations</li>
            <li><span className="auth-side-feature-icon">💬</span> Live chats with your favorite writers</li>
            <li><span className="auth-side-feature-icon">🔥</span> Reading streaks &amp; milestones</li>
          </ul>
        </div>

        {/* ── Form panel ── */}
        <div className="auth-card">
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Join thousands of readers & writers today</p>

        {error && (
          <div className="auth-alert error">
            <span>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div className="auth-alert success">
            <span>✅</span> {success}
          </div>
        )}

        <form onSubmit={handleRegister} className="auth-form">
          {/* Username */}
          <div className="auth-field">
            <label className="auth-label">Username</label>
            <input
              type="text"
              className="auth-input"
              placeholder="Choose a unique username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div className="auth-field">
            <label className="auth-label">Email Address</label>
            <input
              type="email"
              className="auth-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {/* Strength meter */}
            {password && (
              <>
                <div className="pw-strength-bar-wrap">
                  <div
                    className="pw-strength-bar"
                    style={{
                      width: `${(strength.score / 5) * 100}%`,
                      background: strength.color
                    }}
                  />
                </div>
                <span className="pw-strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </>
            )}
          </div>

          {/* Confirm Password */}
          <div className="auth-field">
            <label className="auth-label">Confirm Password</label>
            <input
              type="password"
              className="auth-input"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="auth-divider">Security Question</div>

          {/* Hint info */}
          <div className="auth-hint-info">
            <span>💡</span>
            <span>Your security question is used to recover your password if you ever forget it. Choose one and remember your answer!</span>
          </div>

          {/* Hint Question Select */}
          <div className="auth-field">
            <label className="auth-label">Choose a Question</label>
            <select
              className="auth-select"
              value={hintQuestion}
              onChange={(e) => setHintQuestion(e.target.value)}
            >
              {HINT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Hint Answer */}
          <div className="auth-field">
            <label className="auth-label">Your Answer</label>
            <input
              type="text"
              className="auth-input"
              placeholder="Type your memorable answer..."
              value={hintAnswer}
              onChange={(e) => setHintAnswer(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? <span className="auth-spinner" /> : 'Create Account →'}
          </button>
        </form>

        <p className="auth-switch-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-switch-link">Sign in</Link>
        </p>
        </div>
      </div>
    </div>
  );
};

export default Register;