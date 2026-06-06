require('dotenv').config();
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
const adminRoutes = require('./routes/admin');

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

app.use(cors());
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
    const newUser = new User({ username, email, password, hintQuestion, hintAnswer });
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
    if (user.password !== password) return res.status(400).json({ message: "Invalid credentials" });
    
    if (user.status === 'suspended') {
      return res.status(403).json({ 
        message: "Access Denied. This account has been suspended by an administrator." 
      });
    }

    res.status(200).json({ 
      message: "Login successful!", 
      user: { 
        _id: user._id,
        username: user.username, 
        email: user.email,
        isAdmin: user.isAdmin,
        isWriter: user.isWriter,
        writerRequestStatus: user.writerRequestStatus,
        hasSeenWelcome: user.hasSeenWelcome,
        favorites: user.favorites || []
      } 
    });
  } catch (error) {
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
    const user = await User.findById(req.params.id).select('isWriter writerRequestStatus');
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ isWriter: user.isWriter, writerRequestStatus: user.writerRequestStatus });
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));