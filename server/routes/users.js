const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const WriterRequest = require('../models/WriterRequest');
const Novel = require('../models/Novel');
const Article = require('../models/Article');
const { auth } = require('../middleware/auth');
const { upload, toDataUri } = require('../lib/upload');
const { coverUrl } = require('../lib/media');
const {
  escapeRegex,
  validateUsername,
  isValidEmail,
  validatePassword,
  usernameFilter,
  isValidContentType,
  isValidObjectId,
} = require('../lib/validation');

// Reading-history entries used to store a full base64 copy of each cover,
// which could push a user document toward MongoDB's 16MB limit. Covers are
// now resolved on read, so drop any stored copies whenever we save.
const stripStoredCovers = (user) => {
  for (const item of user.readingHistory) {
    if (item.coverPhoto) item.coverPhoto = undefined;
  }
};

const router = express.Router();

// True when another account (case-insensitively) already uses this username.
const usernameTakenByOther = async (username, selfId) => {
  const existing = await User.findOne(usernameFilter(username)).select('_id');
  return !!existing && existing._id.toString() !== selfId.toString();
};

router.get('/api/users/check-status/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('status');
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ status: user.status || 'active' });
  } catch (error) {
    res.status(500).json({ error: "Server error checking status context" });
  }
});

// User Settings Update
router.put('/api/users/:id/settings', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ error: "Access denied. You can only update your own settings." });
    }
    const { username, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // If attempting to change password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required to set a new password." });
      }
      const passwordError = validatePassword(newPassword);
      if (passwordError) return res.status(400).json({ error: passwordError });
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect current password." });
      }
      // Hash new password
      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Update basic info. The form always sends the current username, so
    // only validate when it actually changes (older accounts may predate
    // the username rules).
    if (username && username.trim() !== user.username) {
      const usernameError = validateUsername(username);
      if (usernameError) return res.status(400).json({ error: usernameError });
      if (await usernameTakenByOther(username, user._id)) {
        return res.status(409).json({ error: "That username is already taken." });
      }
      user.username = username.trim();
    }

    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    if (normalizedEmail && normalizedEmail !== (user.email || '').toLowerCase()) {
      if (!isValidEmail(normalizedEmail)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }
      // Check if new email is already taken
      const existingEmail = await User.findOne({ email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: 'i' } });
      if (existingEmail && existingEmail._id.toString() !== user._id.toString()) {
        return res.status(400).json({ error: "Email is already in use by another account." });
      }
      user.email = normalizedEmail;
    }

    // Handle Profile Picture Upload
    if (req.file) {
      user.profilePicture = toDataUri(req.file);
    }

    await user.save();
    
    // Return updated user (excluding password)
    res.json({ 
      message: "Settings updated successfully!",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        isWriter: user.isWriter,
        writerRequestStatus: user.writerRequestStatus,
        profilePicture: user.profilePicture,
        favorites: user.favorites || []
      }
    });
  } catch (error) {
    console.error("Settings update error:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

router.post('/api/writer-requests', auth, async (req, res) => {
    try {
        const { reason } = req.body;
        const userId = req.user._id.toString();
        const username = req.user.username;
        const existingRequest = await WriterRequest.findOne({ userId, status: 'pending' });
        const user = await User.findById(userId);
        
        if (existingRequest || user?.writerRequestStatus === 'pending') {
            return res.status(400).json({ message: "You already have a pending request." });
        }

        const newRequest = new WriterRequest({ userId, username, reason });
        await User.findByIdAndUpdate(userId, { writerRequestStatus: 'pending' });
        await newRequest.save();
        res.status(200).json({ message: "Request received successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error while saving request." });
    }
});

router.put('/api/users/update-welcome/:userId', auth, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: "Access denied." });
    }
    await User.findByIdAndUpdate(req.params.userId, { hasSeenWelcome: true });
    res.status(200).json({ message: "Welcome status updated" });
  } catch (err) {

    res.status(500).json({ error: "Failed to update welcome status" });
  }
});

// --- User & Interaction Routes ---

router.post('/api/favorites', auth, async (req, res) => {
  const { userId, contentId, title, type } = req.body;
  if (req.user._id.toString() !== userId) {
    return res.status(403).json({ error: "Access denied." });
  }
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { favorites: { contentId, title, type } } },
      { returnDocument: 'after' } 
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ message: "Added to favorites", favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ error: "Failed to add favorite" });
  }
});

// Lookup user details by username
router.get('/api/users/by-username/:username', async (req, res) => {
  try {
    const user = await User.findOne(usernameFilter(req.params.username))
      .select('_id username profilePicture');
    
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (error) {
    console.error("User lookup error:", error);
    res.status(500).json({ error: "Server error looking up user" });
  }
});

// Search users to start a new conversation.
// Must stay above '/api/users/:email' — it used to be registered after it,
// so every search was swallowed by that route and failed with 403.
router.get('/api/users/search', async (req, res) => {
  try {
    const { q, excludeId } = req.query;
    if (typeof q !== 'string' || !q.trim()) return res.json({ users: [] });

    const query = {
      // Escaped: user input is matched literally, never run as a pattern.
      username: { $regex: escapeRegex(q.trim().slice(0, 50)), $options: 'i' }
    };
    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: excludeId };
    }

    const users = await User.find(query)
      .select('_id username profilePicture')
      .limit(10);
      
    res.json({ users });
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({ error: "Server error searching users" });
  }
});


// Lookup the platform admin to contact (used by the "Contact Admin" sidebar button)
// Must stay above the generic '/api/users/:email' route below, otherwise
// "admin-contact" gets swallowed as an :email param and 404s.
router.get('/api/users/admin-contact', auth, async (req, res) => {
  try {
    const admin = await User.findOne({ isAdmin: true }).sort({ createdAt: 1 }).select('_id username profilePicture');
    if (!admin) return res.status(404).json({ error: "No admin account found" });
    res.json({ admin });
  } catch (error) {
    console.error("Admin contact lookup error:", error);
    res.status(500).json({ error: "Server error looking up admin contact" });
  }
});

router.get('/api/users/:email', auth, async (req, res) => {
  try {
    // This returns the full profile document (favorites, reading history,
    // role flags, etc.) — only the owner may fetch it. Admin lookups of
    // other users go through the dedicated GET /api/admin/users/:id route.
    if (req.user.email !== req.params.email) {
      return res.status(403).json({ error: "Access denied. You can only view your own profile." });
    }
    const user = await User.findOne({ email: req.params.email }).select('-password -hintAnswer');
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error fetching user" });
  }
});

router.get('/api/users/status/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('isWriter writerRequestStatus username');
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ isWriter: user.isWriter, writerRequestStatus: user.writerRequestStatus, username: user.username });
  } catch (error) {
    res.status(500).json({ error: "Server error fetching user status" });
  }
});

router.patch('/api/users/:id', auth, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ error: "Access denied." });
    }
    const { username } = req.body;
    const usernameError = validateUsername(username);
    if (usernameError) return res.status(400).json({ error: usernameError });
    if (await usernameTakenByOther(username, req.user._id)) {
      return res.status(409).json({ error: "That username is already taken." });
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { username: username.trim() },
      { returnDocument: 'after' }
    ).select('-password -hintAnswer'); // never send the hashes back to the client
    if (!updatedUser) return res.status(404).json({ error: "User not found" });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});

router.delete('/api/users/:userId/favorites/:contentId', auth, async (req, res) => {
  try {
    const { userId, contentId } = req.params;
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ error: "Access denied." });
    }
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { favorites: { contentId: contentId } } },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Removed successfully", favorites: user.favorites });
  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({ error: "Failed to remove favorite." });
  }
});

// ==========================================
// 🕒 USER READING HISTORY ROUTES
// ==========================================

// GET: Fetch user history
router.get('/api/users/:userId/history', auth, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: "Access denied." });
    }
    const user = await User.findById(req.params.userId).select('readingHistory');
    if (!user) return res.status(404).json({ error: "User not found" });

    // Sort history by lastRead descending (newest first)
    const history = user.readingHistory
      .map((item) => item.toObject())
      .sort((a, b) => b.lastRead - a.lastRead);

    // Covers are no longer copied into the user document; look up which of
    // these works have a cover (ids only — no image bytes) and hand back URLs.
    const idsOfType = (type) => history
      .filter((h) => h.type === type && isValidObjectId(h.contentId))
      .map((h) => h.contentId);
    const [novelsWithCover, articlesWithCover] = await Promise.all([
      Novel.find({ _id: { $in: idsOfType('novel') }, coverPhoto: { $nin: [null, ''] } }).select('_id').lean(),
      Article.find({ _id: { $in: idsOfType('article') }, coverPhoto: { $nin: [null, ''] } }).select('_id').lean(),
    ]);
    const hasCover = new Set([...novelsWithCover, ...articlesWithCover].map((d) => d._id.toString()));

    res.json(history.map((h) => ({
      ...h,
      coverPhoto: hasCover.has(String(h.contentId)) ? coverUrl(h.type, h.contentId) : null,
    })));
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// GET: Fetch user reading stats (streak, progress, checklist)
router.get('/api/users/:userId/reading-stats', auth, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: "Access denied." });
    }
    // Only the dates are needed — skip loading anything else from the document.
    const user = await User.findById(req.params.userId).select('readingHistory.lastRead');
    if (!user) return res.status(404).json({ error: "User not found" });

    const readingHistory = user.readingHistory || [];
    
    // 1. Calculate active streak
    const uniqueDates = [...new Set(readingHistory.map(item => {
      const d = new Date(item.lastRead);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }))].sort((a, b) => new Date(b) - new Date(a)); // sorted descending (newest first)

    let streak = 0;
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (uniqueDates.length > 0) {
      const firstDate = uniqueDates[0];
      if (firstDate === todayStr || firstDate === yesterdayStr) {
        streak = 1;
        let checkDate = new Date(firstDate);
        
        for (let i = 1; i < uniqueDates.length; i++) {
          checkDate.setDate(checkDate.getDate() - 1);
          const checkDateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
          
          if (uniqueDates[i] === checkDateStr) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // 2. Calculate current week's checkmarks (Monday - Sunday)
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const dayChecklist = []; // [true, false, ...]
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dayStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      
      const hasRead = uniqueDates.includes(dayStr);
      dayChecklist.push(hasRead);
    }

    const daysReadThisWeek = dayChecklist.filter(Boolean).length;
    const weeklyGoal = 5; // Default weekly goal
    const progressPercentage = Math.round((daysReadThisWeek / weeklyGoal) * 100);

    res.json({
      streak,
      weeklyGoal,
      daysReadThisWeek,
      progressPercentage,
      dayChecklist
    });
  } catch (error) {
    console.error("Error fetching reading stats:", error);
    res.status(500).json({ error: "Failed to fetch reading stats" });
  }
});

// POST: Add or update item in history
router.post('/api/users/:userId/history', auth, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: "Access denied." });
    }
    // coverPhoto from the client is ignored on purpose — see stripStoredCovers.
    const { contentId, title, type } = req.body;
    if (!isValidObjectId(contentId) || !isValidContentType(type)) {
      return res.status(400).json({ error: "A valid contentId and type ('novel' or 'article') are required." });
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if item already exists in history
    const existingIndex = user.readingHistory.findIndex(item => item.contentId === contentId);

    if (existingIndex > -1) {
      // Update lastRead
      user.readingHistory[existingIndex].lastRead = Date.now();
      // Optionally update other metadata if it changed
      user.readingHistory[existingIndex].title = title;
    } else {
      // Add new
      user.readingHistory.push({
        contentId,
        title,
        type,
        lastRead: Date.now()
      });
    }

    stripStoredCovers(user);
    await user.save();
    res.status(200).json({ message: "History updated" });
  } catch (error) {
    console.error("Error updating history:", error);
    res.status(500).json({ error: "Failed to update history" });
  }
});

// DELETE: Remove a single item from history
router.delete('/api/users/:userId/history/:contentId', auth, async (req, res) => {
  try {
    const { userId, contentId } = req.params;
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ error: "Access denied." });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.readingHistory = user.readingHistory.filter(item => item.contentId !== contentId);
    stripStoredCovers(user);
    await user.save();
    
    res.status(200).json({ message: "Item removed from history" });
  } catch (error) {
    console.error("Error removing from history:", error);
    res.status(500).json({ error: "Failed to remove item" });
  }
});

// DELETE: Clear all history
router.delete('/api/users/:userId/history', auth, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: "Access denied." });
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.readingHistory = [];
    await user.save();
    
    res.status(200).json({ message: "History cleared" });
  } catch (error) {
    console.error("Error clearing history:", error);
    res.status(500).json({ error: "Failed to clear history" });
  }
});

module.exports = router;
