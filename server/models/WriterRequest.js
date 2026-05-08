const mongoose = require('mongoose');

const WriterRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: String,
    reason: String,
    status: { type: String, default: 'pending' }, // pending, approved, rejected
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WriterRequest', WriterRequestSchema);