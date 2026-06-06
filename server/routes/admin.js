const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const Novel = require('../models/Novel');     
const Article = require('../models/Article'); 

/**
 * =========================================================================
 * 👥 SECTION 1: USER DIRECTORY & MANAGEMENT ROUTES
 * =========================================================================
 * Base prefix assigned: /api/admin
 */

// 📊 GET ALL USERS
// Full Route: GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username email isAdmin isWriter status createdAt');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔄 TOGGLE WRITER ROLE
// Full Route: PATCH /api/admin/users/:id/toggle-writer
router.patch('/users/:id/toggle-writer', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const updatedIsWriter = !user.isWriter;
        user.isWriter = updatedIsWriter;
        
        if (updatedIsWriter) {
            user.writerRequestStatus = 'approved';
        } else {
            user.writerRequestStatus = 'none';
        }

        await user.save();
        res.json({ message: `User successfully changed to ${updatedIsWriter ? 'Writer' : 'Reader'}`, user });
    } catch (err) {
        res.status(500).json({ error: "Server error during role modification" });
    }
});

// 🛑 UPDATE USER STATUS
// Full Route: PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', async (req, res) => {
    const { status } = req.body; 
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { new: true }
        );
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ message: `Account status updated to ${status} successfully`, user });
    } catch (err) {
        res.status(500).json({ error: "Server error during account status synchronization" });
    }
});


/**
 * =========================================================================
 * 📚 SECTION 2: CONTENT OVERSIGHT & MODERATION ROUTES
 * =========================================================================
 * Base prefix assigned: /api/admin
 */

// 📊 GET COMBINED OVERVIEW AUDIT REGISTRY INDEX LIST
// Full Route: GET /api/admin/content
router.get('/content', async (req, res) => {
    try {
        // Populating 'authorId' to match the database schemas defined in your novel/article routes
        const [novels, articles] = await Promise.all([
            Novel.find().populate('authorId', 'username email').lean(),
            Article.find().populate('authorId', 'username email').lean()
        ]);

        // Transform the payload schema so the UI component reads the profile under '.author'
        const mappedNovels = novels.map(n => ({ 
            ...n, 
            contentType: 'novel',
            author: n.authorId 
        }));
        
        const mappedArticles = articles.map(a => ({ 
            ...a, 
            contentType: 'article',
            author: a.authorId 
        }));

        const combinedContent = [...mappedNovels, ...mappedArticles].sort((a, b) => {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

        res.json(combinedContent);
    } catch (err) {
        console.error("Error gathering global master content list:", err);
        res.status(500).json({ error: "Failed to assemble systemic database assets array" });
    }
});

// 🗑️ DELETE TARGETED CONTENT ATOM
// Full Route: DELETE /api/admin/content/:type/:id
router.delete('/content/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    try {
        if (type === 'novel') {
            await Novel.findByIdAndDelete(id);
        } else if (type === 'article') {
            await Article.findByIdAndDelete(id);
        } else {
            return res.status(400).json({ error: "Invalid systemic categorization label reference." });
        }

        res.json({ message: `Successfully expunged target ${type} record cleanly.` });
    } catch (err) {
        console.error(`Database deletion execution runtime error for targeting ${type}:`, err);
        res.status(500).json({ error: "Internal database structural modification exception." });
    }
});

module.exports = router;