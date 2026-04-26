require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const multer = require('multer');
const Novel = require('./models/Novel');
const Article = require('./models/Article');

const upload = multer({ dest: 'uploads/' })

const app = express();
app.use(cors());
app.use(express.json()); 
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB librarydb!'))
  .catch((err) => console.error('Could not connect to MongoDB:', err));


// Route to handle registration
app.post('/register', async (req, res) => {
  console.log("Data received from frontend:", req.body); // <--- Add this log

  try {
    const { username, email, password, hintQuestion, hintAnswer } = req.body;
    
    const newUser = new User({ 
      username, 
      email, 
      password, 
      hintQuestion, 
      hintAnswer 
    });

    const savedUser = await newUser.save();
    console.log("User saved to DB:", savedUser); // <--- Add this log
    
    res.status(201).json({ message: "Success!" });
  } catch (error) {
    console.error("MongoDB Save Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Attempting login for:", email);
    
    const user = await User.findOne({ email });

    if (!user) {
      console.log("User not found in DB");
      return res.status(400).json({ message: "User not found" });
    }

    if (user.password !== password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("Login success for:", user.email);
    res.status(200).json({ 
      message: "Login successful!", 
      user: { 
        username: user.username, 
        email: user.email,
        isAdmin: user.isAdmin 
      } 
    });

  } catch (error) {
    res.status(500).json({ error: "Server error during login" });
  }
});

app.post('/api/novels', upload.fields([{ name: 'coverPhoto' }, { name: 'textFile' }]), async (req, res) => {
  try {
    const { title, content, authorName, authorSpeech } = req.body;
    
    const newNovel = new Novel({
      title,
      content,
      author: authorName, // Assuming 'author' matches your model field
      authorSpeech,
      coverPhoto: req.files['coverPhoto'] ? req.files['coverPhoto'][0].path : null,
      textFile: req.files['textFile'] ? req.files['textFile'][0].path : null
    });

    await newNovel.save();
    res.status(201).json({ message: "Novel saved successfully!" });
  } catch (error) {
    console.error("Save error:", error);
    res.status(500).json({ error: "Failed to save novel" });
  }
});

// Get all Novels
app.get('/api/novels', async (req, res) => {
  try {
    const novels = await Novel.find().sort({ createdAt: -1 });
    res.json(novels);
  } catch (error) { res.status(500).json({ error: "Failed to fetch novels" }); }
});

// Post a new Article
app.post('/api/articles', upload.fields([{ name: 'coverPhoto' }, { name: 'textFile' }]), async (req, res) => {
  try {
    const { title, content, authorName } = req.body;
    const newArticle = new Article({
      title,
      content,
      author: authorName,
      coverPhoto: req.files['coverPhoto'] ? req.files['coverPhoto'][0].path : null,
      textFile: req.files['textFile'] ? req.files['textFile'][0].path : null
    });
    await newArticle.save();
    res.status(201).json({ message: "Article saved successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save article" });
  }
});

// Get all Articles
app.get('/api/articles', async (req, res) => {
  try {
    const articles = await Article.find().sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) { res.status(500).json({ error: "Failed to fetch articles" }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));