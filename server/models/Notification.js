const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    senderName: String, // Store the name here separately for easy access
    type: { type: String, enum: ['like', 'comment', 'system'], required: true },
    contentId: { type: mongoose.Schema.Types.ObjectId }, 
    message: String,
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);