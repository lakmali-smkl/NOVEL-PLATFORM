import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

const Login = ({ setUser }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Forgot Password modal states ──
  const [showForgot, setShowForgot] = useState(false);
  const [fpStep, setFpStep] = useState(1);   // 1 = email, 2 = hint+new pw
  const [fpEmail, setFpEmail] = useState('');
  const [fpHint, setFpHint] = useState('');
  const [fpAnswer, setFpAnswer] = useState('');
  const [fpNewPw, setFpNewPw] = useState('');
  const [fpConfirmPw, setFpConfirmPw] = useState('');
  const [fpMsg, setFpMsg] = useState({ type: '', text: '' });
  const [fpLoading, setFpLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);

        if (data.user.writerRequestStatus === 'none') {
          localStorage.removeItem('writerRequestStatus');
        }

        if (data.user.isAdmin) navigate('/admin-dashboard');
        else if (data.user.isWriter) navigate('/writer-dashboard');
        else navigate('/');
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch {
      setError('Cannot connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Forgot: Step 1 — fetch hint question ──
  const handleFpStep1 = async (e) => {
    e.preventDefault();
    setFpMsg({ type: '', text: '' });
    setFpLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/forgot-password/hint?email=${encodeURIComponent(fpEmail)}`);
      const data = await res.json();
      if (res.ok) {
        setFpHint(data.hintQuestion);
        setFpStep(2);
      } else {
        setFpMsg({ type: 'error', text: data.error || 'Email not found.' });
      }
    } catch {
      setFpMsg({ type: 'error', text: 'Cannot connect to server.' });
    } finally {
      setFpLoading(false);
    }
  };

  // ── Forgot: Step 2 — verify answer & reset password ──
  const handleFpStep2 = async (e) => {
    e.preventDefault();
    setFpMsg({ type: '', text: '' });
    if (fpNewPw !== fpConfirmPw) {
      setFpMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setFpLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, hintAnswer: fpAnswer, newPassword: fpNewPw })
      });
      const data = await res.json();
      if (res.ok) {
        setFpMsg({ type: 'success', text: data.message });
        setTimeout(() => {
          setShowForgot(false);
          setFpStep(1);
          setFpEmail(''); setFpHint(''); setFpAnswer('');
          setFpNewPw(''); setFpConfirmPw('');
          setFpMsg({ type: '', text: '' });
        }, 2500);
      } else {
        setFpMsg({ type: 'error', text: data.error || 'Reset failed.' });
      }
    } catch {
      setFpMsg({ type: 'error', text: 'Cannot connect to server.' });
    } finally {
      setFpLoading(false);
    }
  };

  const closeForgot = () => {
    setShowForgot(false);
    setFpStep(1);
    setFpEmail(''); setFpHint(''); setFpAnswer('');
    setFpNewPw(''); setFpConfirmPw('');
    setFpMsg({ type: '', text: '' });
  };

  return (
    <div className="auth-wrapper">
      {/* ── Background decorations ── */}
      <div className="auth-bg-orb orb-1" />
      <div className="auth-bg-orb orb-2" />
      <div className="auth-bg-orb orb-3" />

      <div className="auth-card">
        {/* Logo / Brand */}
        <div className="auth-brand">
          <span className="auth-brand-icon">📖</span>
          <span className="auth-brand-name">NovelVerse</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue reading</p>

        {error && (
          <div className="auth-alert error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
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

          <div className="auth-field">
            <div className="auth-label-row">
              <label className="auth-label">Password</label>
              <button type="button" className="auth-forgot-link" onClick={() => setShowForgot(true)}>
                Forgot password?
              </button>
            </div>
            <div className="auth-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="••••••••"
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
          </div>

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="auth-spinner" />
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        <p className="auth-switch-text">
          Don't have an account?{' '}
          <Link to="/register" className="auth-switch-link">Create one free</Link>
        </p>
      </div>

      {/* ── Forgot Password Modal ── */}
      {showForgot && (
        <div className="fp-modal-overlay" onClick={closeForgot}>
          <div className="fp-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="fp-close-btn" onClick={closeForgot}>✕</button>

            <div className="fp-modal-icon">🔑</div>
            <h2 className="fp-modal-title">
              {fpStep === 1 ? 'Reset Password' : 'Verify & Reset'}
            </h2>
            <p className="fp-modal-sub">
              {fpStep === 1
                ? 'Enter your registered email to retrieve your security question.'
                : `Answer your security question below.`}
            </p>

            {fpMsg.text && (
              <div className={`fp-msg ${fpMsg.type}`}>
                {fpMsg.type === 'success' ? '✅' : '⚠️'} {fpMsg.text}
              </div>
            )}

            {fpStep === 1 ? (
              <form onSubmit={handleFpStep1} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label">Registered Email</label>
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="your@email.com"
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="auth-submit-btn" disabled={fpLoading}>
                  {fpLoading ? <span className="auth-spinner" /> : 'Find My Account →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleFpStep2} className="auth-form">
                <div className="fp-hint-box">
                  <span className="fp-hint-icon">❓</span>
                  <p className="fp-hint-text">{fpHint}</p>
                </div>
                <div className="auth-field">
                  <label className="auth-label">Your Answer</label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Type your answer..."
                    value={fpAnswer}
                    onChange={(e) => setFpAnswer(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label">New Password</label>
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="Min. 6 characters"
                    value={fpNewPw}
                    onChange={(e) => setFpNewPw(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="Repeat new password"
                    value={fpConfirmPw}
                    onChange={(e) => setFpConfirmPw(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="auth-submit-btn" disabled={fpLoading}>
                  {fpLoading ? <span className="auth-spinner" /> : 'Reset Password ✓'}
                </button>
                <button type="button" className="fp-back-btn" onClick={() => setFpStep(1)}>
                  ← Use a different email
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;