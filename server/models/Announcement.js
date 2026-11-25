const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  // 'info' = blue, 'priority' = red, 'event' = gold
  type: { type: String, default: 'info' }, 
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    // TTL index: MongoDB deletes the document once expiresAt has passed.
    // (The option name is expireAfterSeconds — it was previously misspelled
    // "expiresAfterSeconds", so no TTL index was ever created.)
    index: { expireAfterSeconds: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', AnnouncementSchema);