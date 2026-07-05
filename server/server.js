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
// SERVER SPIN UP
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));