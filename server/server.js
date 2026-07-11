require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');

const User = require('./models/User');
const Novel = require('./models/Novel');
const Article = require('./models/Article');
const WriterRequest = require('./models/WriterRequest');
const Notification = require('./models/Notification'); 
const Announcement = require('./models/Announcement');
const Message = require('./models/Message');
const adminRoutes = require('./routes/admin');
const Collection = require('./models/Collection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth, admin } = require('./middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// 🗺️ MOUNT ADMIN ROUTER 
// This automatically adds the '/api/admin' prefix to everything inside routes/admin.js
app.use('/api/admin', adminRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB librarydb!'))
  .catch((err) => console.error('Could not connect to MongoDB:', err));


// ==========================================
// SECURITY GUARD MIDDLEWARE
// ==========================================
const checkSuspensionStatus = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.userId || req.body.userId;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findById(userId).select('status');
      if (user && user.status === 'suspended') {
        return res.status(403).json({ 
          error: "SUSPENDED", 
          message: "Your account has been suspended. Access denied to platform resources." 
        });
      }
    }
    next();
  } catch (error) {
    next();
  }
};


// --- Auth Routes ---

app.post('/register', async (req, res) => {
  try {
    const { username, email, password, hintQuestion, hintAnswer } = req.body;
    
    // Hash password and hint answer
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedHintAnswer = await bcrypt.hash(hintAnswer.toLowerCase().trim(), 10);

    const newUser = new User({ 
      username, 
      email, 
      password: hashedPassword, 
      hintQuestion, 
      hintAnswer: hashedHintAnswer 
    });
    
    await newUser.save();
    res.status(201).json({ message: "Success!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "User not found" });
    
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

    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
    
    if (user.status === 'suspended') {
      return res.status(403).json({ 
        message: "Access Denied. This account has been suspended by an administrator." 
      });
    }

    // Sign JWT token
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin, isWriter: user.isWriter },
      process.env.JWT_SECRET || 'super_secure_jwt_key_novel_platform_123',
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
        favorites: user.favorites || []
      } 
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

app.get('/api/users/check-status/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('status');
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ status: user.status || 'active' });
  } catch (error) {
    res.status(500).json({ error: "Server error checking status context" });
  }
});

// User Settings Update
app.put('/api/users/:id/settings', upload.single('profilePicture'), async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // If attempting to change password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required to set a new password." });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect current password." });
      }
      // Hash new password
      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Update basic info
    if (username) user.username = username;
    
    if (email && email !== user.email) {
      // Check if new email is already taken
      const existingEmail = await User.findOne({ email });
      if (existingEmail && existingEmail._id.toString() !== user._id.toString()) {
        return res.status(400).json({ error: "Email is already in use by another account." });
      }
      user.email = email;
    }

    // Handle Profile Picture Upload
    if (req.file) {
      user.profilePicture = req.file.path.replace(/\\/g, '/'); // Normalize path
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

// --- Admin Control Routes (Core Platform) ---

app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalWriters = await User.countDocuments({ isWriter: true });
    const pendingApprovals = await User.countDocuments({ writerRequestStatus: 'pending' });
    const novelCount = await Novel.countDocuments();
    const articleCount = await Article.countDocuments();

    res.json({
      totalUsers,
      totalWriters,
      pendingApprovals,
      totalWorks: novelCount + articleCount
    });
  } catch (error) {
    console.error("Stats API Error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.post('/api/writer-requests', async (req, res) => {
    try {
        const { userId, username, reason } = req.body;
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

app.get('/api/admin/writer-requests', async (req, res) => {
  try {
    const writerRequests = await WriterRequest.find().sort({ createdAt: -1 });
    const requestedUserIds = writerRequests.map(wr => wr.userId.toString());
    const orphanedUsers = await User.find({ 
      writerRequestStatus: 'pending',
      _id: { $nin: requestedUserIds }
    }).select('_id username');
    
    const orphanedRequests = orphanedUsers.map(user => ({
      _id: user._id,
      userId: user._id,
      username: user.username,
      reason: '(No reason provided)',
      status: 'pending',
      createdAt: new Date()
    }));

    const handledUsersWithoutRequest = await User.find({
      writerRequestStatus: { $in: ['approved', 'rejected'] },
      _id: { $nin: requestedUserIds }
    }).select('_id username writerRequestStatus');

    const handledRequests = handledUsersWithoutRequest.map(user => ({
      _id: user._id,
      userId: user._id,
      username: user.username,
      reason: '(Historical request)',
      status: user.writerRequestStatus,
      createdAt: new Date()
    }));
    
    const allRequests = [...writerRequests, ...orphanedRequests, ...handledRequests];
    res.json(allRequests);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

app.post('/api/admin/approve-writer/:id', async (req, res) => {
  const { action } = req.body; 
  try {
    const update = action === 'approve' 
      ? { isWriter: true, writerRequestStatus: 'approved' , hasSeenWelcome: false}
      : { writerRequestStatus: 'rejected' };

    await User.findByIdAndUpdate(req.params.id, update);
    await WriterRequest.findOneAndUpdate(
      { userId: req.params.id, status: 'pending' },
      { status: action === 'approve' ? 'approved' : 'rejected' }
    );
    res.json({ message: `Writer ${action}ed successfully` });
  } catch (error) {
    res.status(500).json({ error: "Action failed" });
  }
});

// DELETE history record — only removes the WriterRequest doc, does NOT touch User fields
app.delete('/api/admin/writer-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid record ID." });
    }
    // Just delete the document; if it doesn't exist (synthetic record) still return 200
    await WriterRequest.findByIdAndDelete(id);
    res.json({ message: "Record removed from history." });
  } catch (error) {
    console.error("Delete writer-request error:", error);
    res.status(500).json({ error: "Failed to delete record." });
  }
});

app.put('/api/users/update-welcome/:userId', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.userId, { hasSeenWelcome: true });
    res.status(200).json({ message: "Welcome status updated" });
  } catch (err) {

    res.status(500).json({ error: "Failed to update welcome status" });
  }
});

// --- Novel Routes ---

app.post('/api/novels', upload.fields([{ name: 'coverPhoto' }, { name: 'textFile' }]), async (req, res) => {
  try {
    const { title, content, authorName, authorSpeech, authorId, status } = req.body;
    const newNovel = new Novel({
      title, 
      content, 
      author: authorName, 
      authorSpeech,
      authorId, 
      coverPhoto: req.files['coverPhoto'] ? req.files['coverPhoto'][0].path : null,
      textFile: req.files['textFile'] ? req.files['textFile'][0].path : null,
      status: status || 'draft'
    });
    
    await newNovel.save();
    res.status(201).json({ message: "Novel saved successfully!" });
  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ error: "Failed to save novel" });
  }
});

app.get('/api/novels', async (req, res) => {
  try {
    const novels = await Novel.find({ status: 'published' }).sort({ createdAt: -1 });
    res.json(novels);
  } catch (error) { res.status(500).json({ error: "Failed to fetch novels" }); }
});

app.get('/api/novels/author/:authorId', async (req, res) => {
  try {
    const novels = await Novel.find({ authorId: req.params.authorId }).sort({ createdAt: -1 });
    res.json(novels);
  } catch (error) { res.status(500).json({ error: "Failed to fetch author novels" }); }
});

app.get('/api/novels/:id', async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ error: "Novel not found" });

    if (novel.status === 'draft') {
      const requesterId = req.query.userId;
      if (!novel.authorId || novel.authorId.toString() !== requesterId) {
        return res.status(403).json({ error: "This novel is a private draft and cannot be viewed." });
      }
    }
    res.json(novel);
  } catch (error) { res.status(500).json({ error: "Server error" }); }
});

// --- Article Routes ---

app.post('/api/articles', upload.fields([{ name: 'coverPhoto' }, { name: 'textFile' }]), async (req, res) => {
  try {
    const { title, content, authorName, authorId, status } = req.body; 
    const newArticle = new Article({
      title, 
      content, 
      author: authorName,
      authorId: authorId,
      status: status || 'draft',
      coverPhoto: req.files['coverPhoto'] ? req.files['coverPhoto'][0].path : null,
      textFile: req.files['textFile'] ? req.files['textFile'][0].path : null
    });

    await newArticle.save();
    res.status(201).json({ message: "Article saved successfully!" });
  } catch (error) {
    console.error("Save Error:", error); 
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/articles', async (req, res) => {
  try {
    const articles = await Article.find({ status: 'published' }).sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) { res.status(500).json({ error: "Failed to fetch articles" }); }
});

app.get('/api/articles/author/:authorId', async (req, res) => {
  try {
    const articles = await Article.find({ authorId: req.params.authorId }).sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) { res.status(500).json({ error: "Failed to fetch author articles" }); }
});

app.get('/api/articles/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: "Article not found" });

    if (article.status === 'draft') {
      const requesterId = req.query.userId;
      if (!article.authorId || article.authorId.toString() !== requesterId) {
        return res.status(403).json({ error: "This article is a private draft and cannot be viewed." });
      }
    }
    res.json(article);
  } catch (error) { res.status(500).json({ error: "Server error" }); }
});

// --- User & Interaction Routes ---

app.post('/api/favorites', async (req, res) => {
  const { userId, contentId, title, type } = req.body;
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

app.get('/api/users/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error fetching user" });
  }
});

app.get('/api/users/status/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('isWriter writerRequestStatus username');
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ isWriter: user.isWriter, writerRequestStatus: user.writerRequestStatus, username: user.username });
  } catch (error) {
    res.status(500).json({ error: "Server error fetching user status" });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  try {
    const { username } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { username }, 
      { returnDocument: 'after' }
    );
    if (!updatedUser) return res.status(404).json({ error: "User not found" });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Update failed" });
  }
});

app.put('/api/novels/:id', async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ error: "Novel not found" });

    const { userId, ...updateData } = req.body;
    if (!novel.authorId || novel.authorId.toString() !== userId) {
      return res.status(403).json({ error: "Access denied. You are not the author of this novel." });
    }

    const updatedNovel = await Novel.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' });
    res.json({ message: "Novel updated!", data: updatedNovel });
  } catch (error) { res.status(500).json({ error: "Update failed" }); }
});

app.put('/api/articles/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: "Article not found" });

    const { userId, ...updateData } = req.body;
    if (!article.authorId || article.authorId.toString() !== userId) {
      return res.status(403).json({ error: "Access denied. You are not the author of this article." });
    }

    const updatedArticle = await Article.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' });
    res.json({ message: "Article updated!", data: updatedArticle });
  } catch (error) { res.status(500).json({ error: "Update failed" }); }
});

app.delete('/api/users/:userId/favorites/:contentId', async (req, res) => {
  try {
    const { userId, contentId } = req.params;
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { favorites: { contentId: contentId } } },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Removed successfully", favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/:type/:id/status', async (req, res) => {
  const { status } = req.body; 
  const Model = req.params.type === 'novel' ? Novel : Article;
  try {
    await Model.findByIdAndUpdate(req.params.id, { status });
    res.json({ message: "Status updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

app.delete('/api/novels/:id', async (req, res) => {
  try {
    await Novel.findByIdAndDelete(req.params.id);
    res.json({ message: "Novel deleted successfully" });
  } catch (error) { res.status(500).json({ error: "Delete failed" }); }
});

app.delete('/api/articles/:id', async (req, res) => {
  try {
    await Article.findByIdAndDelete(req.params.id);
    res.json({ message: "Article deleted successfully" });
  } catch (error) { res.status(500).json({ error: "Delete failed" }); }
});

app.post('/api/:type/:id/like', async (req, res) => {
  const { userId } = req.body;
  const Model = req.params.type === 'novel' ? Novel : Article;
  try {
    const item = await Model.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Content not found" });

    const likingUser = await User.findById(userId);
    const likerName = likingUser ? likingUser.username : "A reader";
    const isLiking = !item.likes.includes(userId);
    
    if (isLiking) {
      item.likes.push(userId);
      if (item.authorId && item.authorId.toString() !== userId) {
        const newNotif = new Notification({
          recipient: item.authorId,
          sender: userId,
          type: 'like',
          contentId: item._id,
          contentType: req.params.type,
          message: `${likerName} liked your ${req.params.type}: "${item.title}"`
        });
        await newNotif.save();
      } 
    } else {
      item.likes.pull(userId);
    }

    await item.save();
    res.json({ likesCount: item.likes.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/:type/:id/comment', async (req, res) => {
  const { userId, username, text } = req.body;
  const Model = req.params.type === 'novel' ? Novel : Article;
  try {
    const item = await Model.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Content not found" });

    const newComment = {
      userId,
      username,
      text,
      createdAt: new Date(),
      replies: []
    };

    item.comments.push(newComment);
    await item.save();

    // Trigger Notification: notify the author if another reader leaves a comment
    if (item.authorId && item.authorId.toString() !== userId) {
      const newNotif = new Notification({
        recipient: item.authorId,
        sender: userId,
        type: 'comment',
        contentId: item._id,
        contentType: req.params.type,
        message: `${username} commented on your ${req.params.type}: "${item.title}"`
      });
      await newNotif.save();
    }

    res.json(item.comments);
  } catch (err) {
    console.error("Comment Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/:type/:id/comment/:commentId/reply', async (req, res) => {
  const { userId, username, text } = req.body;
  const Model = req.params.type === 'novel' ? Novel : Article;
  try {
    const item = await Model.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Content not found" });

    const comment = item.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const newReply = {
      userId,
      username,
      text,
      createdAt: new Date()
    };

    if (!comment.replies) {
      comment.replies = [];
    }
    comment.replies.push(newReply);
    await item.save();

    // Trigger Notification: notify the comment author
    if (comment.userId && comment.userId.toString() !== userId) {
      const newNotif = new Notification({
        recipient: comment.userId,
        sender: userId,
        type: 'comment',
        contentId: item._id,
        contentType: req.params.type,
        message: `${username} replied to your comment on "${item.title}"`
      });
      await newNotif.save();
    }

    // Trigger Notification: notify the novel/article author (if they are a different person)
    if (item.authorId && item.authorId.toString() !== userId && item.authorId.toString() !== comment.userId?.toString()) {
      const newNotif = new Notification({
        recipient: item.authorId,
        sender: userId,
        type: 'comment',
        contentId: item._id,
        contentType: req.params.type,
        message: `${username} replied to a comment on your ${req.params.type}: "${item.title}"`
      });
      await newNotif.save();
    }

    res.json(item.comments);
  } catch (err) {
    console.error("Reply Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a comment (either work author or comment author can delete)
app.delete('/api/:type/:id/comment/:commentId', async (req, res) => {
  const { type, id, commentId } = req.params;
  const { userId } = req.body;
  const Model = type === 'novel' ? Novel : Article;
  try {
    const item = await Model.findById(id);
    if (!item) return res.status(404).json({ error: "Content not found" });

    const comment = item.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const isCommentAuthor = comment.userId && comment.userId.toString() === userId;
    const isWorkAuthor = item.authorId && item.authorId.toString() === userId;

    if (!isCommentAuthor && !isWorkAuthor) {
      return res.status(403).json({ error: "Unauthorized to delete this comment" });
    }

    item.comments.pull(commentId);
    await item.save();
    res.json(item.comments);
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a reply (either work author or reply author can delete)
app.delete('/api/:type/:id/comment/:commentId/reply/:replyId', async (req, res) => {
  const { type, id, commentId, replyId } = req.params;
  const { userId } = req.body;
  const Model = type === 'novel' ? Novel : Article;
  try {
    const item = await Model.findById(id);
    if (!item) return res.status(404).json({ error: "Content not found" });

    const comment = item.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const reply = comment.replies.id(replyId);
    if (!reply) return res.status(404).json({ error: "Reply not found" });

    const isReplyAuthor = reply.userId && reply.userId.toString() === userId;
    const isWorkAuthor = item.authorId && item.authorId.toString() === userId;

    if (!isReplyAuthor && !isWorkAuthor) {
      return res.status(403).json({ error: "Unauthorized to delete this reply" });
    }

    comment.replies.pull(replyId);
    await item.save();
    res.json(item.comments);
  } catch (err) {
    console.error("Delete reply error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications || []);
  } catch (error) { res.status(500).json({ error: "Failed to fetch notifications" }); }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const deleted = await Notification.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Notification not found" });
    res.json({ message: "Notification deleted" });
  } catch (error) { res.status(500).json({ error: "Failed to delete notification" }); }
});

app.put('/api/notifications/read-all/:userId', async (req, res) => {
  await Notification.updateMany({ recipient: req.params.userId }, { isRead: true });
  res.status(200).send("Updated");
});

app.get('/api/notifications/unread/:userId', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.params.userId, isRead: false });
    res.json({ count });
  } catch (error) { res.status(500).json({ error: "Failed to fetch count" }); }
});

app.post('/api/admin/announcements', async (req, res) => {
  try {
    const { title, message, type, expiresAt} = req.body;
    const newAnnouncement = new Announcement({ title, message, type, expiresAt: expiresAt || undefined });
    await newAnnouncement.save();
    res.status(201).json({ message: "Announcement published successfully!" });
  } catch (err) { res.status(500).json({ error: "Failed to save announcement" }); }
});

app.get('/api/announcements', async (req, res) => {
  try {
    // 🌟 FIX: Only find announcements where expiresAt is Greater Than or Equal to right now
    const list = await Announcement.find({
      expiresAt: { $gte: new Date() }
    })
    .sort({ createdAt: -1 })
    .limit(3);
    
    res.json(list);
  } catch (err) { 
    console.error("Announcement GET error:", err);
    res.status(500).json({ error: "Error fetching announcements" }); 
  }
});



/// ==========================================
// 📁 SEPARATE COLLECTION BACKEND ROUTES
// ==========================================

// 📥 1. FETCH all collection folders belonging to a specific user
app.get('/api/collections/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Find all standalone collection documents matching this user's ID
    const userCollections = await Collection.find({ userId });
    res.status(200).json(userCollections || []);
  } catch (error) {
    console.error("Collection Load Error:", error);
    res.status(500).json({ error: "Error reading collections data profiles" });
  }
});

// 🛠️ 2. NEW CREATION ROUTE: Saves a brand new folder document linked to a user
app.post('/api/collections/create', async (req, res) => {
  try {
    const { userId, name, icon } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ error: "Missing required userId or folder name parameters." });
    }

    const newCollection = new Collection({
      userId,             // 🔍 Crucial: Ties this folder to the logged-in user
      name,
      icon: icon || '📁',
      savedItems: []      // Starts empty
    });

    await newCollection.save();
    res.status(201).json(newCollection);
  } catch (error) {
    console.error("Collection Creation Route Error:", error);
    res.status(500).json({ error: "Failed to initialize new custom reading shelf." });
  }
});

// ➕ 3. POST: Add a novel or article item to a specific collection folder
app.post('/api/collections/:collectionId/add-item', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { id, title, type, author } = req.body;

    const collection = await Collection.findById(collectionId);
    if (!collection) return res.status(404).json({ error: "Collection not found" });

    // Check if item already exists to prevent duplicates
    const exists = collection.savedItems.some(i => i._id === id);
    if (exists) return res.status(400).json({ message: "Item already in this collection" });

    // Push and save
    collection.savedItems.push({ _id: id, title, type, author });
    await collection.save();

    res.status(200).json({ message: "Saved!", collection });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==========================================
// 📁 SEPARATE COLLECTION BACKEND ROUTES
// ==========================================


// 🔥 👇 ADD THIS MISSING ROUTE HERE 👇 🔥
// 🔍 4. GET: Fetch a single collection folder by its ID for the details page
app.get('/api/collections/single/:collectionId', async (req, res) => {
  try {
    const { collectionId } = req.params;
    
    // Find the specific collection folder by its unique MongoDB _id
    const collectionFolder = await Collection.findById(collectionId);
    
    if (!collectionFolder) {
      return res.status(404).json({ error: "Collection folder not found." });
    }
    
    res.status(200).json(collectionFolder);
  } catch (error) {
    console.error("Error fetching single collection details:", error);
    res.status(500).json({ error: "Failed to load collection items details." });
  }
});

// ==========================================
// 📁 COLLECTION MANAGEMENT — DELETE ROUTES
// ==========================================

// 🗑️ 5. DELETE: Remove an entire collection folder
app.delete('/api/collections/:id', async (req, res) => {
  try {
    const deleted = await Collection.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Collection not found.' });
    res.json({ message: 'Collection deleted successfully.' });
  } catch (error) {
    console.error('Delete collection error:', error);
    res.status(500).json({ error: 'Failed to delete collection.' });
  }
});

// ✂️ 6. DELETE: Remove a single saved item from inside a collection
app.delete('/api/collections/:collectionId/items/:itemId', async (req, res) => {
  try {
    const { collectionId, itemId } = req.params;
    const collection = await Collection.findById(collectionId);
    if (!collection) return res.status(404).json({ error: 'Collection not found.' });

    collection.savedItems = collection.savedItems.filter(
      (item) => item._id.toString() !== itemId
    );
    await collection.save();
    res.json({ message: 'Item removed from collection.', collection });
  } catch (error) {
    console.error('Remove item error:', error);
    res.status(500).json({ error: 'Failed to remove item.' });
  }
});

// ==========================================
// 🕒 USER READING HISTORY ROUTES
// ==========================================

// GET: Fetch user history
app.get('/api/users/:userId/history', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Sort history by lastRead descending (newest first)
    const history = user.readingHistory.sort((a, b) => b.lastRead - a.lastRead);
    res.json(history);
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// POST: Add or update item in history
app.post('/api/users/:userId/history', async (req, res) => {
  try {
    const { contentId, title, type, coverPhoto } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if item already exists in history
    const existingIndex = user.readingHistory.findIndex(item => item.contentId === contentId);

    if (existingIndex > -1) {
      // Update lastRead
      user.readingHistory[existingIndex].lastRead = Date.now();
      // Optionally update other metadata if it changed
      user.readingHistory[existingIndex].title = title;
      user.readingHistory[existingIndex].coverPhoto = coverPhoto;
    } else {
      // Add new
      user.readingHistory.push({
        contentId,
        title,
        type,
        coverPhoto,
        lastRead: Date.now()
      });
    }

    await user.save();
    res.status(200).json({ message: "History updated" });
  } catch (error) {
    console.error("Error updating history:", error);
    res.status(500).json({ error: "Failed to update history" });
  }
});

// DELETE: Remove a single item from history
app.delete('/api/users/:userId/history/:contentId', async (req, res) => {
  try {
    const { userId, contentId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.readingHistory = user.readingHistory.filter(item => item.contentId !== contentId);
    await user.save();
    
    res.status(200).json({ message: "Item removed from history" });
  } catch (error) {
    console.error("Error removing from history:", error);
    res.status(500).json({ error: "Failed to remove item" });
  }
});

// DELETE: Clear all history
app.delete('/api/users/:userId/history', async (req, res) => {
  try {
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

// ==========================================
// 🤖 AI RECOMMENDATION ENGINE
// ==========================================

app.get('/api/recommendations/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const readHistory = user.readingHistory || [];
    const favorites = user.favorites || [];

    // --- BUILD USER PREFERENCE PROFILE ---
    const readContentIds = new Set(readHistory.map(h => h.contentId));
    const favoriteIds = new Set(favorites.map(f => f.contentId));

    // Count author appearances in history
    const authorFreq = {};
    const genreFreq = {};
    let novelCount = 0, articleCount = 0;

    readHistory.forEach(h => {
      if (h.type === 'novel') novelCount++;
      else articleCount++;
    });

    // Fetch all published novels + articles not yet read
    const [novels, articles] = await Promise.all([
      Novel.find({ status: 'published' }),
      Article.find({ status: 'published' })
    ]);

    // Gather author/genre frequencies from history-matched novels
    const allNovels = novels.filter(n => readContentIds.has(n._id.toString()));
    allNovels.forEach(n => {
      if (n.author) authorFreq[n.author] = (authorFreq[n.author] || 0) + 1;
      if (n.genre)  genreFreq[n.genre]   = (genreFreq[n.genre]   || 0) + 1;
    });
    const allArticles = articles.filter(a => readContentIds.has(a._id.toString()));
    allArticles.forEach(a => {
      if (a.author)   authorFreq[a.author]   = (authorFreq[a.author]   || 0) + 1;
      if (a.category) genreFreq[a.category]  = (genreFreq[a.category]  || 0) + 1;
    });

    const totalTypeReads = novelCount + articleCount || 1;
    const novelRatio   = novelCount   / totalTypeReads;
    const articleRatio = articleCount / totalTypeReads;

    // --- SCORE EACH CANDIDATE ITEM ---
    const maxViews = Math.max(
      ...novels.map(n => n.views || 0),
      ...articles.map(a => a.views || 0),
      1
    );
    const maxLikes = Math.max(
      ...novels.map(n => (n.likes || []).length),
      ...articles.map(a => (a.likes || []).length),
      1
    );

    const scoreItem = (item, type) => {
      const id = item._id.toString();
      if (readContentIds.has(id)) return null; // Already read — exclude

      let score = 0;

      // 1. Author match (40 pts max)
      const authorScore = authorFreq[item.author] || 0;
      score += Math.min(authorScore * 10, 40);

      // 2. Genre / category match (30 pts max)
      const itemGenre = item.genre || item.category || 'other';
      const genreScore = genreFreq[itemGenre] || 0;
      score += Math.min(genreScore * 10, 30);

      // 3. Content type preference (20 pts max)
      if (type === 'novel')   score += novelRatio   * 20;
      if (type === 'article') score += articleRatio * 20;

      // 4. Popularity: normalised views + likes (10 pts max)
      const normViews = (item.views || 0) / maxViews;
      const normLikes = ((item.likes || []).length) / maxLikes;
      score += (normViews * 0.5 + normLikes * 0.5) * 10;

      // 5. Recency bonus (5 pts max) - newer items get slight boost
      const ageMs = Date.now() - new Date(item.createdAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - ageDays / 365);
      score += recencyScore * 5;

      // Determine why this was recommended (for "Because..." tooltip)
      let reason = 'Popular on the platform';
      if (authorScore > 0)  reason = `Because you read ${item.author}`;
      else if (genreScore > 0) reason = `Based on your ${itemGenre} reading`;

      // Favorite boost — if item is in favourites somehow (shouldn't be, but bonus if so)
      if (favoriteIds.has(id)) score += 5;

      return {
        _id: item._id,
        title: item.title,
        author: item.author,
        coverPhoto: item.coverPhoto,
        genre: itemGenre,
        views: item.views || 0,
        likes: (item.likes || []).length,
        type,
        score: Math.round(score * 10) / 10,
        reason
      };
    };

    const scoredNovels   = novels.map(n => scoreItem(n, 'novel')).filter(Boolean);
    const scoredArticles = articles.map(a => scoreItem(a, 'article')).filter(Boolean);

    const combined = [...scoredNovels, ...scoredArticles]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Return top 10

    res.json({ recommendations: combined, hasHistory: readHistory.length > 0 });
  } catch (error) {
    console.error("Recommendation engine error:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

// ==========================================
// 💬 DIRECT MESSAGES & CHAT API
// ==========================================

// Lookup user details by username
app.get('/api/users/by-username/:username', async (req, res) => {
  try {
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${req.params.username}$`, 'i') } 
    }).select('_id username profilePicture');
    
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (error) {
    console.error("User lookup error:", error);
    res.status(500).json({ error: "Server error looking up user" });
  }
});

// Search users to start a new conversation
app.get('/api/users/search', async (req, res) => {
  try {
    const { q, excludeId } = req.query;
    if (!q) return res.json({ users: [] });

    const query = {
      username: { $regex: q, $options: 'i' }
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

// Fetch conversation list for a user
app.get('/api/messages/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).sort({ createdAt: -1 });

    const convMap = {};
    for (const msg of messages) {
      const otherUserId = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();
      if (!convMap[otherUserId]) {
        convMap[otherUserId] = {
          lastMessage: msg.text,
          lastMessageAt: msg.createdAt,
          unreadCount: 0
        };
      }
      if (msg.receiver.toString() === userId && !msg.read) {
        convMap[otherUserId].unreadCount += 1;
      }
    }

    const otherUserIds = Object.keys(convMap);
    const users = await User.find({ _id: { $in: otherUserIds } }).select('username profilePicture');
    
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u;
    });

    const conversations = otherUserIds.map(id => {
      const u = userMap[id];
      return {
        userId: id,
        username: u ? u.username : 'Unknown User',
        profilePicture: u ? u.profilePicture : '',
        lastMessage: convMap[id].lastMessage,
        lastMessageAt: convMap[id].lastMessageAt,
        unreadCount: convMap[id].unreadCount
      };
    }).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    res.json({ conversations });
  } catch (error) {
    console.error("Conversations error:", error);
    res.status(500).json({ error: "Server error fetching conversations" });
  }
});

// Get messages between two users
app.get('/api/messages/:userId/:otherUserId', async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ error: "Invalid user IDs" });
    }

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    }).sort({ createdAt: 1 });

    res.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Server error fetching messages" });
  }
});

// Send message
app.post('/api/messages', async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;
    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newMsg = new Message({
      sender: senderId,
      receiver: receiverId,
      text: text.trim()
    });

    await newMsg.save();
    res.status(201).json({ message: "Message sent!", data: newMsg });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Server error sending message" });
  }
});

// Mark messages as read
app.put('/api/messages/read/:senderId/:receiverId', async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;
    await Message.updateMany(
      { sender: senderId, receiver: receiverId, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Read messages error:", error);
    res.status(500).json({ error: "Server error marking messages as read" });
  }
});

// Get total unread count for a user (across all conversations)
app.get('/api/messages/unread-count/:userId', async (req, res) => {
  try {
    const count = await Message.countDocuments({ receiver: req.params.userId, read: false });
    res.json({ count });
  } catch (error) {
    console.error("Unread messages count error:", error);
    res.status(500).json({ error: "Server error fetching unread count" });
  }
});

// ==========================================
// 🤖 CHATBOT LIBRARY ASSISTANT
// ==========================================
app.post('/api/bot/message', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const msg = message.toLowerCase().trim();
    let reply = "";
    let suggestions = [];

    // Helper: check if msg contains ANY of the keywords
    const has = (...keywords) => keywords.some(k => msg.includes(k));

    // ── Greetings ──
    if (has('hi', 'hello', 'hey', 'hola', 'greet', 'good morning', 'good evening', 'good afternoon', 'howdy', 'sup', 'whats up', "what's up")) {
      reply = "Hello! 👋 I'm your Library Helper chatbot.\n\nI can help you:\n📚 Find stories to read\n✍️ Learn how to write & publish\n🎨 Change your theme\n❤️ Save favorites\n💬 Message authors\n🔑 Account & login help\n\nWhat would you like to know?";
    }

    // ── Story Suggestions / Recommendations ──
    else if (has('suggest', 'recommend', 'what should i read', 'what to read', 'pick a book', 'pick a novel', 'good book', 'good novel', 'popular', 'top story', 'best novel', 'best story', 'best book')) {
      const novels = await Novel.find({ status: 'published' }).sort({ views: -1 }).limit(4);
      const articles = await Article.find({ status: 'published' }).sort({ views: -1 }).limit(2);
      reply = novels.length + articles.length > 0
        ? "Here are some top picks from our library! 📚 Click any title to start reading:"
        : "Our library is growing! No published stories yet — but check back soon. In the meantime, explore the Library section from the sidebar!";
      suggestions = [
        ...novels.map(n => ({ _id: n._id, title: n.title, type: 'novel', author: n.author })),
        ...articles.map(a => ({ _id: a._id, title: a.title, type: 'article', author: a.author }))
      ];
    }

    // ── Browse / Explore Library ──
    else if (has('browse', 'explore', 'library', 'find book', 'find novel', 'search book', 'search story', 'discover', 'what is available', 'what can i read', 'catalog')) {
      const count = await Novel.countDocuments({ status: 'published' }) + await Article.countDocuments({ status: 'published' });
      reply = `Our library currently has ${count} published works! 🏛️\n\nTo browse:\n1. Use the 'Library' link in the sidebar\n2. Filter by genre, type (novel/article), or author\n3. Use the search bar at the top to find specific titles\n4. Check the '🔥 Trending Now' section on the home page`;
    }

    // ── Genres ──
    else if (has('genre', 'fantasy', 'romance', 'thriller', 'mystery', 'sci-fi', 'science fiction', 'horror', 'adventure', 'comedy', 'drama', 'historical', 'action')) {
      const novels = await Novel.find({ status: 'published' }).limit(3);
      reply = "We support many genres! 🎭\n\nAvailable genres include:\n📖 Fantasy  •  💕 Romance  •  🔍 Mystery\n🚀 Sci-Fi  •  😱 Horror  •  ⚔️ Adventure\n😂 Comedy  •  🎭 Drama  •  🏛️ Historical\n\nYou can filter by genre in the Library section. Here are some current picks:";
      suggestions = novels.map(n => ({ _id: n._id, title: n.title, type: 'novel', author: n.author }));
    }

    // ── Become a Writer ──
    else if (has('become a writer', 'how to write', 'how do i write', 'want to write', 'start writing', 'apply writer', 'writer application', 'can i publish', 'how to publish', 'create story', 'write a novel', 'write a story')) {
      reply = "Becoming a writer is easy! ✍️\n\nSteps:\n1. Go to your Reader Portal (home page)\n2. Open the sidebar and click '✍️ Become a Writer'\n3. Submit your application\n4. Wait for Admin approval (usually quick!)\n5. Once approved, you'll see the 'Writer Portal' in the sidebar\n\nIn the Writer Portal you can:\n📖 Publish novels with chapters\n📝 Publish articles\n📊 Track views, likes & comments\n📢 Create announcements";
    }

    // ── Writer Dashboard / Portal ──
    else if (has('writer dashboard', 'writer portal', 'writer panel', 'manage story', 'manage novel', 'edit story', 'edit novel', 'update chapter', 'add chapter', 'upload chapter')) {
      reply = "The Writer Portal is your creative hub! 🖊️\n\nFrom the Writer Portal sidebar you can:\n📖 Create & manage Novels (add chapters, cover art)\n📝 Write & publish Articles\n📊 View your story analytics (views, likes, comments)\n💬 Read & reply to reader comments\n📢 Post Announcements to your readers\n\nAccess it from the left sidebar after becoming an approved writer.";
    }

    // ── Comments & Reviews ──
    else if (has('comment', 'review', 'leave a review', 'rate', 'rating', 'feedback', 'opinion', 'reply to comment')) {
      reply = "Interacting with stories is easy! 💬\n\nTo leave a comment:\n1. Open any novel chapter or article\n2. Scroll to the bottom\n3. Type in the comment box and hit 'Post'\n\nYou can also:\n↩️ Reply to other readers' comments\n❤️ Like a story by clicking the heart button\n🗑️ Delete your own comments anytime\n\nWriters can also delete any comments on their own stories.";
    }

    // ── Likes & Favorites ──
    else if (has('like', 'unlike', 'heart', 'favorite', 'favourit', 'save story', 'save novel', 'bookmark', 'save for later', 'wish list', 'saved')) {
      reply = "Saving stories is super easy! ❤️\n\nTo Favorite a story:\n• Click the ❤️ heart button on any story page\n\nTo view your Favorites:\n• Sidebar → 'Favorites' section\n• Filter by All / Novels / Articles using the tabs\n\nTo organize into Collections:\n• Click '+ Add to Collection' on any story\n• Create custom named shelves\n• Find them under sidebar → 'My Library'";
    }

    // ── Collections / Shelves ──
    else if (has('collection', 'shelf', 'shelve', 'organize', 'folder', 'list', 'my list', 'reading list', 'read later')) {
      reply = "Collections let you organize your reading! 📁\n\nHow to use Collections:\n1. Open any story page\n2. Click 'Add to Collection'\n3. Create a new collection or add to existing\n\nYour collections appear in the sidebar under 'Library' → 'Collections'. Great for organizing by genre, mood, or reading priority!";
    }

    // ── Reading History ──
    else if (has('history', 'reading history', 'read before', 'previously read', 'continue reading', 'last read', 'resume', 'where was i')) {
      reply = "Your reading history is automatically saved! 📖\n\nTo access it:\n• Sidebar → 'Reading History'\n\nYour history shows:\n🕒 Recently read stories\n📄 Which chapter you last read\n⏱️ Approximate reading progress\n\nClick any item to jump back to where you left off!";
    }

    // ── Login / Sign In ──
    else if (has('login', 'sign in', 'log in', 'cant login', "can't login", 'login problem', 'login error', 'forgot login')) {
      reply = "Having trouble logging in? 🔑\n\nTry these steps:\n1. Make sure your username and password are correct\n2. Check if CAPS LOCK is on\n3. If you forgot your password, contact the admin\n\nTo log in:\n• Go to the Login page from the navbar or home page\n• Enter your username and password\n• Click 'Login'\n\nNew here? Click 'Sign Up' to create a free account!";
    }

    // ── Register / Sign Up ──
    else if (has('register', 'sign up', 'signup', 'create account', 'new account', 'join', 'get started', 'how to join')) {
      reply = "Creating an account is free and instant! 🎉\n\nTo register:\n1. Click 'Sign Up' on the home page or navbar\n2. Choose a unique username\n3. Enter your email and password\n4. Click 'Register'\n\nOnce registered you can:\n📚 Read all published stories\n❤️ Save favorites & collections\n💬 Comment and interact\n✍️ Apply to become a writer!";
    }

    // ── Account Settings / Profile ──
    else if (has('profile', 'account', 'setting', 'change password', 'update email', 'edit profile', 'my account', 'account info', 'username')) {
      reply = "Managing your account is simple! ⚙️\n\nTo access Settings:\n• Click your avatar/name in the top-right navbar\n• Or go to Sidebar → 'Settings'\n\nIn Settings you can:\n👤 Edit your profile name & bio\n🔒 Change your password\n🎨 Switch your platform theme\n🔔 Manage notification preferences";
    }

    // ── Themes & Appearance ──
    else if (has('theme', 'color', 'dark mode', 'light mode', 'dark theme', 'light theme', 'appearance', 'change color', 'change theme', 'night mode', 'day mode', 'midnight', 'ocean', 'forest', 'purple', 'sunset', 'snow')) {
      reply = "We have 6 stunning themes! 🎨\n\n🌑 Midnight — Deep dark mode\n❄️ Snow — Clean light mode\n🌊 Ocean — Cool blue tones\n🌲 Forest — Natural green tones\n💜 Purple — Rich purple accents\n🌅 Sunset — Warm orange/red tones\n\nTo switch:\n• Click the 🎨 color indicator in the top-right navbar\n• Or go to Settings → Appearance → select a theme card";
    }

    // ── Direct Messages / Chat with Writers ──
    else if (has('message', 'chat', 'dm', 'direct message', 'contact writer', 'talk to writer', 'message author', 'message writer', 'inbox', 'conversation')) {
      reply = "You can chat directly with any writer! 💬\n\nTo message a writer:\n1. Open any of their stories\n2. Click the '💬 Message Writer' button near their name\n\nTo see all your conversations:\n• Sidebar → 'Messages'\n• View unread counts and switch between chats\n\nWriters can also message you back through the same system!";
    }

    // ── Announcements ──
    else if (has('announcement', 'announce', 'news', 'update', 'notification', 'notice', 'platform news')) {
      reply = "Stay up to date with platform news! 📢\n\nAnnouncements appear:\n• On your home dashboard (as highlighted cards at the top)\n• Writers can post announcements to their own readers\n• Admins post platform-wide announcements\n\nCheck the home page regularly for the latest updates!";
    }

    // ── Admin / Moderation ──
    else if (has('admin', 'administrator', 'report', 'ban', 'abuse', 'inappropriate', 'content policy', 'violation', 'moderate', 'moderation')) {
      reply = "For platform issues or content concerns: 🛡️\n\nContent Policy:\n• All published content is reviewed by admins\n• Inappropriate content can be reported\n• Writers must follow community guidelines\n\nAdmin features include:\n👥 Managing users and writer approvals\n📚 Reviewing published content\n📢 Posting platform-wide announcements\n\nIf you have a serious concern, contact the platform administrator directly.";
    }

    // ── Search ──
    else if (has('search', 'how to search', 'find', 'look for', 'look up', 'query')) {
      reply = "Finding stories is easy! 🔍\n\nWays to discover content:\n1. Use the Search bar at the top of the Library page\n2. Filter by genre, type (novel/article), or date\n3. Browse the '🔥 Trending Now' section on home\n4. Check '✨ AI Recommendations' on your dashboard\n5. Ask me: 'Suggest a story' and I'll pull from the database!";
    }

    // ── Reading Progress / Chapters ──
    else if (has('chapter', 'next chapter', 'previous chapter', 'chapter list', 'table of content', 'toc', 'progress', 'continue', 'page')) {
      reply = "Navigating chapters is intuitive! 📑\n\nInside a novel:\n• Use 'Next Chapter' / 'Previous Chapter' buttons at the bottom\n• Click the chapter name in the header to see the full chapter list\n• Your progress is auto-saved so you can continue anytime\n\nTo resume reading:\n• Sidebar → 'Reading History' → click the story to jump back in";
    }

    // ── What is this site / About ──
    else if (has('what is this', 'about', 'what can i do', 'platform', 'site', 'website', 'this app', 'how does this work', 'features')) {
      reply = "Welcome to our Novel Platform! 📖✨\n\nThis is a community reading & writing platform where:\n\n👀 Readers can:\n• Browse and read novels & articles\n• Save favorites and organize collections\n• Comment, like and interact with writers\n• Get AI-powered personalized recommendations\n\n✍️ Writers can:\n• Publish novels (with chapters) & articles\n• Track views, likes and reader engagement\n• Chat directly with readers\n• Post announcements\n\nEverything is themed, personalized, and designed for book lovers!";
    }

    // ── Help / General ──
    else if (has('help', 'support', 'how do i', 'how to', 'guide', 'tutorial', 'instructions', 'explain', 'what', 'show me')) {
      reply = "I'm here to help! 🤖 Here's what I can assist with:\n\n📚 Stories — 'Suggest a novel' or 'Browse library'\n✍️ Writing — 'How to become a writer'\n🎨 Themes — 'Change my theme'\n❤️ Saving — 'How to favorite a story'\n💬 Messaging — 'How to chat with writers'\n🔑 Account — 'Login help' or 'Change password'\n📖 Reading — 'View my reading history'\n🏷️ Genres — 'Show me fantasy novels'\n\nJust ask naturally — I understand plain language!";
    }

    // ── Thank you ──
    else if (has('thank', 'thanks', 'thank you', 'thx', 'ty', 'great', 'awesome', 'perfect', 'nice', 'good job', 'well done', 'helpful')) {
      reply = "You're very welcome! 😊\n\nHappy reading! If you have any more questions, I'm always here. Don't forget to explore the library and discover your next favorite story! 📚✨";
    }

    // ── Goodbye ──
    else if (has('bye', 'goodbye', 'see you', 'later', 'cya', 'exit', 'close', 'quit')) {
      reply = "Goodbye! 👋 Happy reading! Come back anytime you need help. The library awaits! 📚";
    }

    // ── Default fallback ──
    else {
      reply = `I'm not sure I understood "${message.length > 30 ? message.substring(0, 30) + '...' : message}", but I'm happy to help! 🤖\n\nTry asking about:\n📚 "Suggest a story to read"\n✍️ "How do I become a writer?"\n🎨 "How do I change my theme?"\n❤️ "How do I save a favorite?"\n💬 "How to message an author?"\n🔑 "I forgot my password"\n📖 "What is this platform about?"\n\nOr use the quick buttons below!`;
    }

    res.json({ reply, suggestions });
  } catch (error) {
    console.error("Bot API error:", error);
    res.status(500).json({ error: "Server error processing chatbot message" });
  }
});



// ==========================================
// SERVER SPIN UP
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));