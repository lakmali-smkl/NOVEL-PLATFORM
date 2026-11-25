const express = require('express');
const Collection = require('../models/Collection');
const { auth } = require('../middleware/auth');

const router = express.Router();

/// ==========================================
// 📁 SEPARATE COLLECTION BACKEND ROUTES
// ==========================================

// 📥 1. FETCH all collection folders belonging to a specific user
router.get('/api/collections/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ error: "Access denied." });
    }
    // Find all standalone collection documents matching this user's ID
    const userCollections = await Collection.find({ userId });
    res.status(200).json(userCollections || []);
  } catch (error) {
    console.error("Collection Load Error:", error);
    res.status(500).json({ error: "Error reading collections data profiles" });
  }
});

// 🛠️ 2. NEW CREATION ROUTE: Saves a brand new folder document linked to a user
router.post('/api/collections/create', auth, async (req, res) => {
  try {
    const { userId, name, icon } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ error: "Missing required userId or folder name parameters." });
    }
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({ error: "Access denied." });
    }

    const newCollection = new Collection({
      userId,             // 🔍 Crucial: Ties this folder to the logged-in user
      name,
      icon: icon || '📁',
      savedItems: []      // Starts empty
    });

    await newCollection.save();
    res.status(201).json(newCollection);
  } catch (error) {
    console.error("Collection Creation Route Error:", error);
    res.status(500).json({ error: "Failed to initialize new custom reading shelf." });
  }
});

// ➕ 3. POST: Add a novel or article item to a specific collection folder
router.post('/api/collections/:collectionId/add-item', auth, async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { id, title, type, author } = req.body;

    const collection = await Collection.findById(collectionId);
    if (!collection) return res.status(404).json({ error: "Collection not found" });
    if (collection.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied." });
    }

    // Check if item already exists to prevent duplicates
    const exists = collection.savedItems.some(i => i._id === id);
    if (exists) return res.status(400).json({ message: "Item already in this collection" });

    // Push and save
    collection.savedItems.push({ _id: id, title, type, author });
    await collection.save();

    res.status(200).json({ message: "Saved!", collection });
  } catch (error) {
    console.error("Add to collection error:", error);
    res.status(500).json({ error: "Failed to save item to collection." });
  }
});


// ==========================================
// 📁 SEPARATE COLLECTION BACKEND ROUTES
// ==========================================


// 🔥 👇 ADD THIS MISSING ROUTE HERE 👇 🔥
// 🔍 4. GET: Fetch a single collection folder by its ID for the details page
router.get('/api/collections/single/:collectionId', auth, async (req, res) => {
  try {
    const { collectionId } = req.params;

    // Find the specific collection folder by its unique MongoDB _id
    const collectionFolder = await Collection.findById(collectionId);

    if (!collectionFolder) {
      return res.status(404).json({ error: "Collection folder not found." });
    }
    if (collectionFolder.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied." });
    }

    res.status(200).json(collectionFolder);
  } catch (error) {
    console.error("Error fetching single collection details:", error);
    res.status(500).json({ error: "Failed to load collection items details." });
  }
});

// ==========================================
// 📁 COLLECTION MANAGEMENT — DELETE ROUTES
// ==========================================

// 🗑️ 5. DELETE: Remove an entire collection folder
router.delete('/api/collections/:id', auth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Collection not found.' });
    if (collection.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied." });
    }
    await Collection.findByIdAndDelete(req.params.id);
    res.json({ message: 'Collection deleted successfully.' });
  } catch (error) {
    console.error('Delete collection error:', error);
    res.status(500).json({ error: 'Failed to delete collection.' });
  }
});

// ✂️ 6. DELETE: Remove a single saved item from inside a collection
router.delete('/api/collections/:collectionId/items/:itemId', auth, async (req, res) => {
  try {
    const { collectionId, itemId } = req.params;
    const collection = await Collection.findById(collectionId);
    if (!collection) return res.status(404).json({ error: 'Collection not found.' });
    if (collection.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied." });
    }

    collection.savedItems = collection.savedItems.filter(
      (item) => item._id.toString() !== itemId
    );
    await collection.save();
    res.json({ message: 'Item removed from collection.', collection });
  } catch (error) {
    console.error('Remove item error:', error);
    res.status(500).json({ error: 'Failed to remove item.' });
  }
});

module.exports = router;
