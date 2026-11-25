const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { encryptText, decryptText } = require('../utils/crypto');

const router = express.Router();

// Fetch conversation list for a user
router.get('/api/messages/conversations/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ error: "Access denied." });
    }

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    }).sort({ createdAt: -1 });

    const convMap = {};
    for (const msg of messages) {
      const otherUserId = msg.sender.toString() === userId ? msg.receiver.toString() : msg.sender.toString();
      if (!convMap[otherUserId]) {
        convMap[otherUserId] = {
          lastMessage: decryptText(msg.text),
          lastMessageAt: msg.createdAt,
          unreadCount: 0
        };
      }
      if (msg.receiver.toString() === userId && !msg.read) {
        convMap[otherUserId].unreadCount += 1;
      }
    }

    const otherUserIds = Object.keys(convMap);
    const users = await User.find({ _id: { $in: otherUserIds } }).select('username profilePicture');
    
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u;
    });

    const conversations = otherUserIds.map(id => {
      const u = userMap[id];
      return {
        userId: id,
        username: u ? u.username : 'Unknown User',
        profilePicture: u ? u.profilePicture : '',
        lastMessage: convMap[id].lastMessage,
        lastMessageAt: convMap[id].lastMessageAt,
        unreadCount: convMap[id].unreadCount
      };
    }).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    res.json({ conversations });
  } catch (error) {
    console.error("Conversations error:", error);
    res.status(500).json({ error: "Server error fetching conversations" });
  }
});

// Get messages between two users
router.get('/api/messages/:userId/:otherUserId', auth, async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ error: "Invalid user IDs" });
    }
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ error: "Access denied." });
    }

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    }).sort({ createdAt: 1 });

    const decrypted = messages.map((m) => {
      const obj = m.toObject();
      obj.text = decryptText(obj.text);
      if (obj.replyTo && obj.replyTo.text) {
        obj.replyTo.text = decryptText(obj.replyTo.text);
      }
      return obj;
    });

    res.json({ messages: decrypted });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Server error fetching messages" });
  }
});

// Send message
router.post('/api/messages', auth, async (req, res) => {
  try {
    const { receiverId, text, replyTo, forwarded } = req.body;
    const senderId = req.user._id.toString();
    if (!receiverId || !text) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const plainText = text.trim();
    const plainReplyText = replyTo && replyTo.messageId ? replyTo.text : undefined;

    const newMsg = new Message({
      sender: senderId,
      receiver: receiverId,
      text: encryptText(plainText),
      forwarded: !!forwarded,
      replyTo: replyTo && replyTo.messageId ? {
        messageId: replyTo.messageId,
        text: encryptText(plainReplyText),
        senderUsername: replyTo.senderUsername
      } : undefined
    });

    await newMsg.save();

    const senderName = req.user.username || 'Someone';
    const preview = plainText.length > 80 ? `${plainText.slice(0, 80)}…` : plainText;
    const newNotif = new Notification({
      recipient: receiverId,
      sender: senderId,
      senderName,
      type: 'message',
      message: preview
    });
    await newNotif.save();

    // Respond with the plaintext version — the client already has it, no need to decrypt a round-trip
    const responseMsg = newMsg.toObject();
    responseMsg.text = plainText;
    if (responseMsg.replyTo) {
      responseMsg.replyTo.text = plainReplyText;
    }

    res.status(201).json({ message: "Message sent!", data: responseMsg });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Server error sending message" });
  }
});

// Delete a message (sender only — removes it for both sides, like Telegram's "delete for everyone")
router.delete('/api/messages/:id', auth, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    if (msg.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only delete messages you sent." });
    }
    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: "Message deleted" });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: "Server error deleting message" });
  }
});

// Edit a message (sender only)
router.put('/api/messages/:id', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Message text is required" });
    }
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    if (msg.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only edit messages you sent." });
    }
    const plainText = text.trim();
    msg.text = encryptText(plainText);
    msg.edited = true;
    await msg.save();

    const responseMsg = msg.toObject();
    responseMsg.text = plainText;
    if (responseMsg.replyTo && responseMsg.replyTo.text) {
      responseMsg.replyTo.text = decryptText(responseMsg.replyTo.text);
    }

    res.json({ message: "Message updated", data: responseMsg });
  } catch (error) {
    console.error("Edit message error:", error);
    res.status(500).json({ error: "Server error editing message" });
  }
});

// Toggle a reaction on a message (either participant in the conversation)
router.put('/api/messages/:id/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: "Emoji is required" });

    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    const userId = req.user._id.toString();
    const isParticipant = msg.sender.toString() === userId || msg.receiver.toString() === userId;
    if (!isParticipant) {
      return res.status(403).json({ error: "Access denied." });
    }

    const existingIndex = msg.reactions.findIndex(r => r.userId.toString() === userId);
    if (existingIndex !== -1 && msg.reactions[existingIndex].emoji === emoji) {
      // Same emoji tapped again → remove reaction
      msg.reactions.splice(existingIndex, 1);
    } else if (existingIndex !== -1) {
      // Different emoji → replace
      msg.reactions[existingIndex].emoji = emoji;
    } else {
      msg.reactions.push({ userId, emoji });
    }

    await msg.save();

    const responseMsg = msg.toObject();
    responseMsg.text = decryptText(responseMsg.text);
    if (responseMsg.replyTo && responseMsg.replyTo.text) {
      responseMsg.replyTo.text = decryptText(responseMsg.replyTo.text);
    }

    res.json({ message: "Reaction updated", data: responseMsg });
  } catch (error) {
    console.error("React to message error:", error);
    res.status(500).json({ error: "Server error updating reaction" });
  }
});

// Mark messages as read
router.put('/api/messages/read/:senderId/:receiverId', auth, async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;
    if (req.user._id.toString() !== receiverId) {
      return res.status(403).json({ error: "Access denied." });
    }
    await Message.updateMany(
      { sender: senderId, receiver: receiverId, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Read messages error:", error);
    res.status(500).json({ error: "Server error marking messages as read" });
  }
});

// Get total unread count for a user (across all conversations)
router.get('/api/messages/unread-count/:userId', auth, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: "Access denied." });
    }
    const count = await Message.countDocuments({ receiver: req.params.userId, read: false });
    res.json({ count });
  } catch (error) {
    console.error("Unread messages count error:", error);
    res.status(500).json({ error: "Server error fetching unread count" });
  }
});

module.exports = router;
