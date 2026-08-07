const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Access denied. No session token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id).select('status isAdmin isWriter username email');
    if (!user) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Session invalid or expired." });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: "SUSPENDED", message: "Access Denied. This account has been suspended." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(401).json({ error: "INVALID_TOKEN", message: "Invalid or expired session token." });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return res.status(403).json({ error: "FORBIDDEN", message: "Access Denied. Administrator privileges required." });
  }
};

// For routes that serve both logged-out visitors and owners (e.g. viewing a
// story that may be a private draft) — verifies the token if one is sent,
// but never rejects the request for lacking one. req.user is the verified
// user or null; unlike `auth`, callers must not assume req.user exists.
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('status isAdmin isWriter username email');
    req.user = (user && user.status !== 'suspended') ? user : null;
  } catch (error) {
    req.user = null;
  }
  next();
};

module.exports = { auth, admin, optionalAuth };
