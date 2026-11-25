const express = require('express');
const User = require('../models/User');
const Novel = require('../models/Novel');
const Article = require('../models/Article');
const { auth } = require('../middleware/auth');
const { coverUrlExpr } = require('../lib/media');

// Only the fields the scorer reads. Content, comments and cover bytes stay in
// the database; the cover comes back as a URL (see lib/media.js).
const candidatePipeline = (type) => [
  { $match: { status: 'published' } },
  { $project: {
      title: 1, author: 1, genre: 1, category: 1, views: 1, likes: 1, createdAt: 1,
      coverPhoto: coverUrlExpr(type),
  } },
];

const router = express.Router();

// ==========================================
// 🤖 AI RECOMMENDATION ENGINE
// ==========================================

router.get('/api/recommendations/:userId', auth, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ error: "Access denied." });
    }
    const user = await User.findById(req.params.userId).select('readingHistory.contentId readingHistory.type favorites');
    if (!user) return res.status(404).json({ error: "User not found" });

    const readHistory = user.readingHistory || [];
    const favorites = user.favorites || [];

    // --- BUILD USER PREFERENCE PROFILE ---
    const readContentIds = new Set(readHistory.map(h => h.contentId));
    const favoriteIds = new Set(favorites.map(f => f.contentId));

    // Count author appearances in history
    const authorFreq = {};
    const genreFreq = {};
    let novelCount = 0, articleCount = 0;

    readHistory.forEach(h => {
      if (h.type === 'novel') novelCount++;
      else articleCount++;
    });

    // Fetch all published novels + articles not yet read
    const [novels, articles] = await Promise.all([
      Novel.aggregate(candidatePipeline('novel')),
      Article.aggregate(candidatePipeline('article'))
    ]);

    // Gather author/genre frequencies from history-matched novels
    const allNovels = novels.filter(n => readContentIds.has(n._id.toString()));
    allNovels.forEach(n => {
      if (n.author) authorFreq[n.author] = (authorFreq[n.author] || 0) + 1;
      if (n.genre)  genreFreq[n.genre]   = (genreFreq[n.genre]   || 0) + 1;
    });
    const allArticles = articles.filter(a => readContentIds.has(a._id.toString()));
    allArticles.forEach(a => {
      if (a.author)   authorFreq[a.author]   = (authorFreq[a.author]   || 0) + 1;
      if (a.category) genreFreq[a.category]  = (genreFreq[a.category]  || 0) + 1;
    });

    const totalTypeReads = novelCount + articleCount || 1;
    const novelRatio   = novelCount   / totalTypeReads;
    const articleRatio = articleCount / totalTypeReads;

    // --- SCORE EACH CANDIDATE ITEM ---
    const maxViews = Math.max(
      ...novels.map(n => n.views || 0),
      ...articles.map(a => a.views || 0),
      1
    );
    const maxLikes = Math.max(
      ...novels.map(n => (n.likes || []).length),
      ...articles.map(a => (a.likes || []).length),
      1
    );

    const scoreItem = (item, type) => {
      const id = item._id.toString();
      if (readContentIds.has(id)) return null; // Already read — exclude

      let score = 0;

      // 1. Author match (40 pts max)
      const authorScore = authorFreq[item.author] || 0;
      score += Math.min(authorScore * 10, 40);

      // 2. Genre / category match (30 pts max)
      const itemGenre = item.genre || item.category || 'other';
      const genreScore = genreFreq[itemGenre] || 0;
      score += Math.min(genreScore * 10, 30);

      // 3. Content type preference (20 pts max)
      if (type === 'novel')   score += novelRatio   * 20;
      if (type === 'article') score += articleRatio * 20;

      // 4. Popularity: normalised views + likes (10 pts max)
      const normViews = (item.views || 0) / maxViews;
      const normLikes = ((item.likes || []).length) / maxLikes;
      score += (normViews * 0.5 + normLikes * 0.5) * 10;

      // 5. Recency bonus (5 pts max) - newer items get slight boost
      const ageMs = Date.now() - new Date(item.createdAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - ageDays / 365);
      score += recencyScore * 5;

      // Determine why this was recommended (for "Because..." tooltip)
      let reason = 'Popular on the platform';
      if (authorScore > 0)  reason = `Because you read ${item.author}`;
      else if (genreScore > 0) reason = `Based on your ${itemGenre} reading`;

      // Favorite boost — if item is in favourites somehow (shouldn't be, but bonus if so)
      if (favoriteIds.has(id)) score += 5;

      return {
        _id: item._id,
        title: item.title,
        author: item.author,
        coverPhoto: item.coverPhoto,
        genre: itemGenre,
        views: item.views || 0,
        likes: (item.likes || []).length,
        type,
        score: Math.round(score * 10) / 10,
        reason
      };
    };

    const scoredNovels   = novels.map(n => scoreItem(n, 'novel')).filter(Boolean);
    const scoredArticles = articles.map(a => scoreItem(a, 'article')).filter(Boolean);

    const combined = [...scoredNovels, ...scoredArticles]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Return top 10

    res.json({ recommendations: combined, hasHistory: readHistory.length > 0 });
  } catch (error) {
    console.error("Recommendation engine error:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

module.exports = router;
