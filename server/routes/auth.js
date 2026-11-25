const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  escapeRegex,
  validateUsername,
  isValidEmail,
  validatePassword,
  usernameFilter,
} = require('../lib/validation');

const router = express.Router();

// Same list the Register page offers. Used to answer hint lookups for emails
// that have no account with a plausible decoy question, so the endpoint
// can't be used to discover which emails are registered.
const DECOY_HINT_QUESTIONS = [
  "What's your spirit animal?",
  "If you were a potato, what kind?",
  "What's your go-to karaoke song?",
  "Name of your imaginary childhood friend?",
  "What was your weirdest haircut?",
  "If you had a robot butler, what would you name it?",
  "What's the weirdest thing you've ever eaten?",
  "What's your favorite lazy Sunday activity?",
  "If you could teleport, where's the first place you'd go?",
];
// Deterministic per email, so asking twice returns the same decoy.
const decoyHintFor = (email) => {
  const digest = crypto.createHmac('sha256', process.env.JWT_SECRET).update(email).digest();
  return DECOY_HINT_QUESTIONS[digest.readUInt32BE(0) % DECOY_HINT_QUESTIONS.length];
};
// Compared against when the email is unknown, so both paths cost one bcrypt.
const DUMMY_HASH = bcrypt.hashSync('dummy-answer-for-timing', 10);

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();
// Older accounts were saved with the email exactly as typed (mixed case), so
// lookups match case-insensitively instead of assuming lowercase.
const emailFilter = (email) => ({ email: { $regex: `^${escapeRegex(normalizeEmail(email))}$`, $options: 'i' } });

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, hintQuestion, hintAnswer } = req.body;

    const usernameError = validateUsername(username);
    if (usernameError) return res.status(400).json({ error: usernameError, message: usernameError });
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.', message: 'Please enter a valid email address.' });
    }
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError, message: passwordError });
    if (typeof hintQuestion !== 'string' || !hintQuestion.trim() || typeof hintAnswer !== 'string' || !hintAnswer.trim()) {
      const msg = 'Please choose a security question and provide an answer.';
      return res.status(400).json({ error: msg, message: msg });
    }

    const [emailTaken, usernameTaken] = await Promise.all([
      User.exists(emailFilter(email)),
      User.exists(usernameFilter(username)),
    ]);
    if (emailTaken) {
      return res.status(409).json({ error: 'An account with this email already exists.', message: 'An account with this email already exists.' });
    }
    if (usernameTaken) {
      return res.status(409).json({ error: 'That username is already taken.', message: 'That username is already taken.' });
    }

    // Hash password and hint answer
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedHintAnswer = await bcrypt.hash(hintAnswer.toLowerCase().trim(), 10);

    const newUser = new User({
      username: username.trim(),
      email: normalizeEmail(email),
      password: hashedPassword,
      hintQuestion,
      hintAnswer: hashedHintAnswer
    });

    await newUser.save();
    res.status(201).json({ message: "Success!" });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.', message: 'An account with this email already exists.' });
    }
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error during registration.", message: "Server error during registration." });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Reject non-string input (e.g. {"$ne": null}) before it reaches a query.
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    const user = await User.findOne(emailFilter(email));

    // Same response as a wrong password, so login can't be used to probe
    // which emails have accounts.
    if (!user) return res.status(400).json({ message: "Invalid email or password." });

    let isMatch = false;
    
    // Check if the password is encrypted (bcrypt hash usually starts with $2a$ or $2b$)
    const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
    
    if (isHashed) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Legacy user matching plain text password
      isMatch = user.password === password;
      
      // Migrate legacy password: hash it and update the database
      if (isMatch) {
        user.password = await bcrypt.hash(password, 10);
        // Also clean up legacy plain-text hintAnswer if present
        const isHintHashed = user.hintAnswer && (user.hintAnswer.startsWith('$2a$') || user.hintAnswer.startsWith('$2b$'));
        if (!isHintHashed && user.hintAnswer) {
          user.hintAnswer = await bcrypt.hash(user.hintAnswer.toLowerCase().trim(), 10);
        }
        await user.save();
        console.log(`Migrated legacy user ${user.username} to hashed password.`);
      }
    }

    if (!isMatch) return res.status(400).json({ message: "Invalid email or password." });
    
    if (user.status === 'suspended') {
      return res.status(403).json({ 
        message: "Access Denied. This account has been suspended by an administrator." 
      });
    }

    // Sign JWT token
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin, isWriter: user.isWriter },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({ 
      message: "Login successful!", 
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        isWriter: user.isWriter,
        writerRequestStatus: user.writerRequestStatus,
        hasSeenWelcome: user.hasSeenWelcome,
        profilePicture: user.profilePicture || "",
        favorites: user.favorites || [],
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ── Forgot Password: Step 1 — fetch hint question for email ──
router.get('/api/forgot-password/hint', async (req, res) => {
  try {
    const { email } = req.query;
    if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne(emailFilter(email)).select('hintQuestion');
    // Unknown emails get a stable decoy question instead of a 404, so this
    // endpoint doesn't reveal whether an account exists.
    res.json({ hintQuestion: user ? user.hintQuestion : decoyHintFor(normalizeEmail(email)) });
  } catch (error) {
    console.error("Hint fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Forgot Password: Step 2 — verify answer & reset password ──
router.post('/api/forgot-password/reset', async (req, res) => {
  try {
    const { email, hintAnswer, newPassword } = req.body;
    if (typeof email !== 'string' || typeof hintAnswer !== 'string' || typeof newPassword !== 'string' ||
        !email.trim() || !hintAnswer.trim() || !newPassword)
      return res.status(400).json({ error: "All fields are required." });

    const passwordError = validatePassword(newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const user = await User.findOne(emailFilter(email));
    const answer = hintAnswer.toLowerCase().trim();

    // Verify hint answer (stored as bcrypt hash). Unknown emails still run a
    // bcrypt compare and get the same error, so responses don't reveal
    // whether the account exists.
    let answerMatch = false;
    if (!user) {
      await bcrypt.compare(answer, DUMMY_HASH);
    } else {
      const isHintHashed = user.hintAnswer && (user.hintAnswer.startsWith('$2a$') || user.hintAnswer.startsWith('$2b$'));
      if (isHintHashed) {
        answerMatch = await bcrypt.compare(answer, user.hintAnswer);
      } else if (user.hintAnswer) {
        answerMatch = user.hintAnswer.toLowerCase().trim() === answer;
      }
    }

    if (!answerMatch) return res.status(401).json({ error: "Incorrect email or answer. Please try again." });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password reset successfully! You can now log in with your new password." });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Server error during password reset" });
  }
});

module.exports = router;
