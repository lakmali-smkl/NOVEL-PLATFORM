const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  hintQuestion: { type: String, required: true },
  hintAnswer: { type: String, required: true },
  isWriter: { type: Boolean, default: false },
  favorites: [{
    contentId: { type: String },
    title: { type: String },
    type: { type: String } // 'novel' or 'article'
  }]
});

module.exports = mongoose.model('User', userSchema);