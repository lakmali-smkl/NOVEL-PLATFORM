const mongoose = require('mongoose');

const novelSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String },
    author: { type: String, required: true },
    authorSpeech: { type: String },
    coverPhoto: { type: String }, 
    textFile: { type: String },   
    createdAt: { type: Date, default: Date.now },

    // Add these to both Novel.js and Article.js schemas
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
    }]

});

module.exports = mongoose.model('chapter', novelSchema);