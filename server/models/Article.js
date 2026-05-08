const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },

    authorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    coverPhoto: { type: String }, 
    textFile: { type: String },   
    category: { type: String }, // Optional field for articles
    createdAt: { type: Date, default: Date.now },

    status: { 
        type: String, 
        enum: ['draft', 'published'], 
        default: 'draft' // New works start as drafts by default
    },
    views: { 
        type: Number, 
        default: 0 
    },
  
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
    }]
});



module.exports = mongoose.model('article', articleSchema);