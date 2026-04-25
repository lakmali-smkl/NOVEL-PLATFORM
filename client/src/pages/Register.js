import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // New State for Hint Question and Answer
  const [hintQuestion, setHintQuestion] = useState('Favorite Color');
  const [hintAnswer, setHintAnswer] = useState('');
  
  const navigate = useNavigate();

  // The 10 requested options
  const hintOptions = [
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

  const handleRegister = (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    console.log('Registering user:', { 
      username, 
      email, 
      password, 
      hintQuestion, 
      hintAnswer 
    });
    
    navigate('/login');
  };

  return (
    <div className="login-container">
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input 
          type="text" 
          placeholder="Username" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input 
          type="email" 
          placeholder="Email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input 
          type="password" 
          placeholder="Confirm Password" 
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        
        {/* Hint Dropdown */}
        <select 
          value={hintQuestion} 
          onChange={(e) => setHintQuestion(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        >
          {hintOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        {/* Hint Answer Input */}
        <input 
          type="text" 
          placeholder="Answer to hint" 
          value={hintAnswer}
          onChange={(e) => setHintAnswer(e.target.value)}
          required
        />

        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default Register;