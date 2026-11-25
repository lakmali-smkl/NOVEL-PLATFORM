const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const Novel = require('../models/Novel');     
const Article = require('../models/Article'); 
const mongoose = require('mongoose');
const WriterRequest = require('../models/WriterRequest');
const { auth, admin } = require('../middleware/auth');

// Mount globally for all admin sub-routes
router.use(auth);
router.use(admin); 

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
        console.error("Fetch users error:", err);
        res.status(500).json({ error: "Failed to fetch users." });
    }
});

// 🔍 GET SINGLE USER DETAIL (profile + all their stories/articles + engagement totals)
// Full Route: GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -hintAnswer');
        if (!user) return res.status(404).json({ error: "User not found" });

        const [novels, articles] = await Promise.all([
            Novel.find({ authorId: req.params.id })
                .select('title status genre views likes comments createdAt')
                .sort({ createdAt: -1 })
                .lean(),
            Article.find({ authorId: req.params.id })
                .select('title status category views likes comments createdAt')
                .sort({ createdAt: -1 })
                .lean()
        ]);

        const mapWork = (w, workType) => ({
            _id: w._id,
            title: w.title,
            workType,
            status: w.status,
            views: w.views || 0,
            likeCount: (w.likes || []).length,
            commentCount: (w.comments || []).length,
            createdAt: w.createdAt
        });

        const works = [
            ...novels.map(n => mapWork(n, 'novel')),
            ...articles.map(a => mapWork(a, 'article'))
        ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const totals = works.reduce((acc, w) => {
            acc.totalLikes += w.likeCount;
            acc.totalComments += w.commentCount;
            acc.totalViews += w.views;
            return acc;
        }, { totalLikes: 0, totalComments: 0, totalViews: 0 });

        res.json({ user, works, totals: { ...totals, totalWorks: works.length } });
    } catch (err) {
        console.error("Error fetching user detail:", err);
        res.status(500).json({ error: "Failed to fetch user details" });
    }
});

// 🔄 TOGGLE WRITER ROLE
// Full Route: PATCH /api/admin/users/:id/toggle-writer
router.patch('/users/:id/toggle-writer', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password -hintAnswer');
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
        ).select('-password -hintAnswer');
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
            // The oversight table only shows metadata — leave the full text,
            // covers and comment threads in the database.
            Novel.find().select('-content -coverPhoto -comments -textFile').populate('authorId', 'username email').lean(),
            Article.find().select('-content -coverPhoto -comments -textFile').populate('authorId', 'username email').lean()
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

// 📈 GET SITE GROWTH TRENDS
// Full Route: GET /api/admin/growth
router.get('/growth', async (req, res) => {
    try {
        // Define a MongoDB Aggregation pipeline to group documents by date (YYYY-MM-DD)
        const growthPipeline = [
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }, // Sort chronologically (oldest to newest)
            { $limit: 30 }         // Limit data points to the last 30 days
        ];

        // Run aggregations across your collections concurrently
        const [userGrowth, novelGrowth, articleGrowth] = await Promise.all([
            User.aggregate(growthPipeline),
            Novel.aggregate(growthPipeline),
            Article.aggregate(growthPipeline)
        ]);

        // Send a unified JSON response back to the frontend
        res.json({
            users: userGrowth,
            novels: novelGrowth,
            articles: articleGrowth
        });
    } catch (err) {
        console.error("Error fetching site growth metrics:", err);
        res.status(500).json({ error: "Failed to compile site growth analytics matrix." });
    }
});


/**
 * =========================================================================
 * 🛡️ SECTION: PLATFORM STATS & WRITER APPLICATIONS
 * =========================================================================
 * Base prefix assigned: /api/admin (moved here from server.js)
 */
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalWriters = await User.countDocuments({ isWriter: true });
    const pendingApprovals = await User.countDocuments({ writerRequestStatus: 'pending' });
    const novelCount = await Novel.countDocuments();
    const articleCount = await Article.countDocuments();

    res.json({
      totalUsers,
      totalWriters,
      pendingApprovals,
      totalWorks: novelCount + articleCount
    });
  } catch (error) {
    console.error("Stats API Error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});


router.get('/writer-requests', async (req, res) => {
  try {
    const writerRequests = await WriterRequest.find().sort({ createdAt: -1 });
    const requestedUserIds = writerRequests.map(wr => wr.userId.toString());
    const orphanedUsers = await User.find({ 
      writerRequestStatus: 'pending',
      _id: { $nin: requestedUserIds }
    }).select('_id username');
    
    const orphanedRequests = orphanedUsers.map(user => ({
      _id: user._id,
      userId: user._id,
      username: user.username,
      reason: '(No reason provided)',
      status: 'pending',
      createdAt: new Date()
    }));

    const handledUsersWithoutRequest = await User.find({
      writerRequestStatus: { $in: ['approved', 'rejected'] },
      _id: { $nin: requestedUserIds }
    }).select('_id username writerRequestStatus');

    const handledRequests = handledUsersWithoutRequest.map(user => ({
      _id: user._id,
      userId: user._id,
      username: user.username,
      reason: '(Historical request)',
      status: user.writerRequestStatus,
      createdAt: new Date()
    }));
    
    const allRequests = [...writerRequests, ...orphanedRequests, ...handledRequests];
    res.json(allRequests);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

router.post('/approve-writer/:id', async (req, res) => {
  const { action } = req.body;
  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ error: "Action must be 'approve' or 'reject'." });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid user ID." });
  }
  try {
    const update = action === 'approve' 
      ? { isWriter: true, writerRequestStatus: 'approved' , hasSeenWelcome: false}
      : { writerRequestStatus: 'rejected' };

    await User.findByIdAndUpdate(req.params.id, update);
    await WriterRequest.findOneAndUpdate(
      { userId: req.params.id, status: 'pending' },
      { status: action === 'approve' ? 'approved' : 'rejected' }
    );
    res.json({ message: `Writer ${action}ed successfully` });
  } catch (error) {
    res.status(500).json({ error: "Action failed" });
  }
});

// DELETE history record — only removes the WriterRequest doc, does NOT touch User fields
router.delete('/writer-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid record ID." });
    }
    // Just delete the document; if it doesn't exist (synthetic record) still return 200
    await WriterRequest.findByIdAndDelete(id);
    res.json({ message: "Record removed from history." });
  } catch (error) {
    console.error("Delete writer-request error:", error);
    res.status(500).json({ error: "Failed to delete record." });
  }
});

module.exports = router;
