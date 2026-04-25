const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comments: [{ 
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
        text: String, 
        date: { type: Date, default: Date.now } 
    }],
    reactions: [{ 
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
        type: String 
    }]
});

module.exports = mongoose.model('Article', articleSchema);