import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Register.css'; // Ensure this matches your file name

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hintQuestion, setHintQuestion] = useState("What's your spirit animal?");
  const [hintAnswer, setHintAnswer] = useState('');
  
  const navigate = useNavigate();

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

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          email, 
          password, 
          hintQuestion, 
          hintAnswer 
        })
      });

      const data = await response.json();

      if (response.ok) {
        navigate('/login');
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Error connecting to server:", error);
      alert("Make sure your backend server is running!");
    }
  };

  return (
    <div className="auth-wrapper">
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
            
            <select 
              value={hintQuestion} 
              onChange={(e) => setHintQuestion(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            >
              {hintOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

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
    </div>
  );
};

export default Register;