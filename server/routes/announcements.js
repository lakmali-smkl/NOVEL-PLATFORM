const express = require('express');
const Announcement = require('../models/Announcement');
const { auth, admin } = require('../middleware/auth');

const router = express.Router();

router.post('/api/admin/announcements', auth, admin, async (req, res) => {
  try {
    const { title, message, type, expiresAt} = req.body;
    const newAnnouncement = new Announcement({ title, message, type, expiresAt: expiresAt || undefined });
    await newAnnouncement.save();
    res.status(201).json({ message: "Announcement published successfully!" });
  } catch (err) { res.status(500).json({ error: "Failed to save announcement" }); }
});

// Admin management list — all currently-live announcements (no 3-item cap),
// used by the "Recent Dispatched Bulletins" panel for editing/deleting.
router.get('/api/admin/announcements', auth, admin, async (req, res) => {
  try {
    const list = await Announcement.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Error fetching announcements" });
  }
});

router.put('/api/admin/announcements/:id', auth, admin, async (req, res) => {
  try {
    const { title, message, type, expiresAt } = req.body;
    const updated = await Announcement.findByIdAndUpdate(
      req.params.id,
      { title, message, type, expiresAt: expiresAt || undefined },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "Announcement not found" });
    res.json({ message: "Announcement updated successfully!", announcement: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update announcement" });
  }
});

router.delete('/api/admin/announcements/:id', auth, admin, async (req, res) => {
  try {
    const deleted = await Announcement.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Announcement not found" });
    res.json({ message: "Announcement deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

router.get('/api/announcements', async (req, res) => {
  try {
    // 🌟 FIX: Only find announcements where expiresAt is Greater Than or Equal to right now
    const list = await Announcement.find({
      expiresAt: { $gte: new Date() }
    })
    .sort({ createdAt: -1 })
    .limit(3);
    
    res.json(list);
  } catch (err) { 
    console.error("Announcement GET error:", err);
    res.status(500).json({ error: "Error fetching announcements" }); 
  }
});

module.exports = router;
