const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/api/notifications/:userId', auth, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: "Access denied." });
    }
    const notifications = await Notification.find({ recipient: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications || []);
  } catch (error) { res.status(500).json({ error: "Failed to fetch notifications" }); }
});

router.delete('/api/notifications/:id', auth, async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ error: "Notification not found" });
    if (notif.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied." });
    }
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Notification deleted" });
  } catch (error) { res.status(500).json({ error: "Failed to delete notification" }); }
});

router.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ error: "Notification not found" });
    if (notif.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied." });
    }
    notif.isRead = true;
    await notif.save();
    res.json({ message: "Notification marked as read", data: notif });
  } catch (error) { res.status(500).json({ error: "Failed to mark notification as read" }); }
});

router.put('/api/notifications/read-all/:userId', auth, async (req, res) => {
  if (req.user._id.toString() !== req.params.userId) {
    return res.status(403).json({ error: "Access denied." });
  }
  try {
    await Notification.updateMany({ recipient: req.params.userId, isRead: false }, { isRead: true });
    res.status(200).send("Updated");
  } catch (error) {
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

router.get('/api/notifications/unread/:userId', auth, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: "Access denied." });
    }
    const count = await Notification.countDocuments({ recipient: req.params.userId, isRead: false });
    res.json({ count });
  } catch (error) { res.status(500).json({ error: "Failed to fetch count" }); }
});

module.exports = router;
