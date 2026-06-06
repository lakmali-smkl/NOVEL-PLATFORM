const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Path to your User model


router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username email isAdmin isWriter status createdAt');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🚀 PROMOTE TO WRITER
router.put('/api/admin/users/promote/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isWriter: true, writerRequestStatus: 'approved' }, // Turn them into a writer
      { new: true }
    );
    res.json({ message: "User promoted to writer successfully", user });
  } catch (err) {
    res.status(500).json({ error: "Server error during promotion" });
  }
});

// 📉 DEMOTE TO READER
router.put('/api/admin/users/demote/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isWriter: false }, // Strip writer permissions, returns them to normal reader
      { new: true }
    );
    res.json({ message: "Writer demoted to reader successfully", user });
  } catch (err) {
    res.status(500).json({ error: "Server error during demotion" });
  }
});

module.exports = router;