const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String }, // Optional field for articles
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('article', articleSchema);