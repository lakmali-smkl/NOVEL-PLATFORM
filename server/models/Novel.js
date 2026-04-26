const mongoose = require('mongoose');

const novelSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String }, // Made optional if you upload a .txt file
  author: { type: String, required: true },
  authorSpeech: { type: String },
  coverPhoto: { type: String }, // Stores the path (e.g., 'uploads/12345.jpg')
  textFile: { type: String },   // Stores the path
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('chapter', novelSchema);