const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  hintQuestion: { type: String, required: true },
  hintAnswer: { type: String, required: true },
  
  isWriter: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false }, // New: Admin capability
  hasSeenWelcome: { type: Boolean, default: false },
  writerRequestStatus: { 
    type: String, 
    enum: ['none', 'pending', 'approved', 'rejected'], 
    default: 'none' 
  },

  status: { 
    type: String, 
    enum: ['active', 'suspended'], 
    default: 'active' 
  },

  favorites: [{
    contentId: { type: String },
    title: { type: String },
    type: { type: String } // 'novel' or 'article'
  }],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);