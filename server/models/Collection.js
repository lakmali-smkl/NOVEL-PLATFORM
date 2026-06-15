const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  icon: { type: String, default: '📁' },
  
  // 🔥 CRITICAL: Ensure this is named 'savedItems' to match your ReadPage UI!
  savedItems: [{
    _id: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true }, 
    author: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Collection', CollectionSchema);