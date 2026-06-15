const mongoose = require('mongoose');

const novelSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String },
    author: { type: String, required: true },

    authorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },

    authorSpeech: { type: String },
    coverPhoto: { type: String }, 
    textFile: { type: String },   
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

},{ timestamps: true });

module.exports = mongoose.model('chapter', novelSchema);