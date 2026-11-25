const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Novel = require('../models/Novel');
const Article = require('../models/Article');
const Notification = require('../models/Notification');
const { auth, optionalAuth } = require('../middleware/auth');
const { upload, toDataUri } = require('../lib/upload');
const { coverUrlExpr, parseDataUri } = require('../lib/media');
const {
  pick,
  NOVEL_EDITABLE_FIELDS,
  ARTICLE_EDITABLE_FIELDS,
  isValidStatus,
  CONTENT_STATUSES,
  isValidContentType,
  isValidObjectId,
} = require('../lib/validation');

const router = express.Router();

const MODELS = { novel: Novel, article: Article };

// For the shared '/api/:type/...' routes: anything other than novel/article
// skips the route (falls through to the 404 handler) instead of silently
// being treated as an article.
const requireContentType = (req, res, next) =>
  (isValidContentType(req.params.type) ? next() : next('route'));

// Lists only show a short preview, so send an excerpt instead of the whole text.
const EXCERPT_LENGTH = 300;

// Builds the aggregation for a list endpoint. Cover images are replaced with
// a URL (see lib/media.js) inside MongoDB, so the image bytes never leave the
// database. `summary` additionally trims content and drops comment bodies
// (keeping a commentCount) for public listings.
const listPipeline = (type, match, { page, limit, summary }) => {
  const pipeline = [{ $match: match }, { $sort: { createdAt: -1 } }];

  // Pagination is opt-in via ?page=&limit= — omitting them keeps the
  // full-array response so current callers are unaffected.
  if (page || limit) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    pipeline.push({ $skip: (p - 1) * l }, { $limit: l });
  }

  const fields = { coverPhoto: coverUrlExpr(type) };
  if (summary) {
    fields.content = { $substrCP: [{ $ifNull: ['$content', ''] }, 0, EXCERPT_LENGTH] };
    fields.commentCount = { $size: { $ifNull: ['$comments', []] } };
  }
  pipeline.push({ $addFields: fields });
  pipeline.push({ $project: summary ? { comments: 0, textFile: 0 } : { textFile: 0 } });
  return pipeline;
};

// Mongoose validation failures are the client's fault → 400, not 500.
const MAX_COMMENT_LENGTH = 2000;
const commentTextError = (text) => {
  if (typeof text !== 'string' || !text.trim()) return 'Comment text is required.';
  if (text.length > MAX_COMMENT_LENGTH) return `Comments are limited to ${MAX_COMMENT_LENGTH} characters.`;
  return null;
};

const isValidationError = (err) => err && (err.name === 'ValidationError' || err.name === 'CastError');

// ── Cover images ──
// Serves a work's cover as a real image so browsers can cache it, instead of
// embedding megabytes of base64 in every JSON list.
router.get('/api/media/:type/:id/cover', async (req, res) => {
  try {
    const Model = MODELS[req.params.type];
    if (!Model || !isValidObjectId(req.params.id)) return res.status(404).end();

    const doc = await Model.findById(req.params.id).select('coverPhoto').lean();
    if (!doc || !doc.coverPhoto) return res.status(404).end();

    const parsed = parseDataUri(doc.coverPhoto);
    if (!parsed) {
      // Legacy records stored a path under the old /uploads folder.
      if (doc.coverPhoto.startsWith('uploads/')) return res.redirect(`/${doc.coverPhoto}`);
      return res.status(404).end();
    }
    res.set('Cache-Control', 'public, max-age=86400');
    res.type(parsed.mime).send(parsed.buffer);
  } catch (error) {
    console.error("Cover fetch error:", error);
    res.status(500).end();
  }
});

// ── Public Platform Stats (for Home page spotlight section) ──
router.get('/api/platform-stats', async (req, res) => {
  try {
    const [totalUsers, publishedNovels, publishedArticles, novelWords, articleWords] = await Promise.all([
      User.countDocuments(),
      Novel.countDocuments({ status: 'published' }),
      Article.countDocuments({ status: 'published' }),
      Novel.aggregate([
        { $match: { content: { $exists: true, $ne: '' } } },
        { $project: { wordCount: { $size: { $split: [{ $trim: { input: '$content' } }, ' '] } } } },
        { $group: { _id: null, total: { $sum: '$wordCount' } } }
      ]),
      Article.aggregate([
        { $match: { content: { $exists: true, $ne: '' } } },
        { $project: { wordCount: { $size: { $split: [{ $trim: { input: '$content' } }, ' '] } } } },
        { $group: { _id: null, total: { $sum: '$wordCount' } } }
      ])
    ]);

    const totalWords = (novelWords[0]?.total || 0) + (articleWords[0]?.total || 0);

    res.json({
      totalUsers,
      publishedNovels,
      publishedArticles,
      totalPublished: publishedNovels + publishedArticles,
      totalWords
    });
  } catch (error) {
    console.error("Platform stats error:", error);
    res.status(500).json({ error: "Failed to fetch platform stats" });
  }
});

// --- Novel Routes ---

router.post('/api/novels', auth, upload.fields([{ name: 'coverPhoto' }, { name: 'textFile' }]), async (req, res) => {
  try {
    const { title, content, authorName, authorSpeech, status } = req.body;
    const newNovel = new Novel({
      title,
      content,
      author: authorName,
      authorSpeech,
      authorId: req.user._id,
      coverPhoto: req.files['coverPhoto'] ? toDataUri(req.files['coverPhoto'][0]) : null,
      // The raw imported .txt/.pdf is never read back anywhere (the client
      // already extracts its text into `content` before this request), so
      // it isn't persisted — nothing was gained by saving it to begin with.
      status: isValidStatus(status) ? status : 'draft'
    });
    
    await newNovel.save();
    res.status(201).json({ message: "Story saved successfully!" });
  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ error: "Failed to save story" });
  }
});

router.get('/api/novels', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const novels = await Novel.aggregate(listPipeline('novel', { status: 'published' }, { page, limit, summary: true }));
    res.json(novels);
  } catch (error) { res.status(500).json({ error: "Failed to fetch stories" }); }
});

// Author views keep full content and comments (the writer dashboard counts
// them); only the cover bytes are swapped for a URL.
const authorFilter = (req) => {
  const authorId = new mongoose.Types.ObjectId(String(req.params.authorId));
  const isOwner = req.user._id.toString() === req.params.authorId;
  return isOwner ? { authorId } : { authorId, status: 'published' };
};

router.get('/api/novels/author/:authorId', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.authorId)) return res.status(400).json({ error: "Invalid author ID" });
    const novels = await Novel.aggregate(listPipeline('novel', authorFilter(req), {}));
    res.json(novels);
  } catch (error) { res.status(500).json({ error: "Failed to fetch author stories" }); }
});

router.get('/api/novels/:id', optionalAuth, async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ error: "Story not found" });

    if (novel.status === 'draft') {
      // Ownership must come from the verified JWT (req.user), never a
      // client-supplied ?userId= — that was trivially spoofable to view
      // any private draft just by knowing its author's id.
      const requesterId = req.user?._id?.toString();
      if (!novel.authorId || novel.authorId.toString() !== requesterId) {
        return res.status(403).json({ error: "This story is a private draft and cannot be viewed." });
      }
    }
    res.json(novel);
  } catch (error) { res.status(500).json({ error: "Server error" }); }
});

// --- Article Routes ---

router.post('/api/articles', auth, upload.fields([{ name: 'coverPhoto' }, { name: 'textFile' }]), async (req, res) => {
  try {
    const { title, content, authorName, status } = req.body;
    const newArticle = new Article({
      title,
      content,
      author: authorName,
      authorId: req.user._id,
      status: isValidStatus(status) ? status : 'draft',
      // See the equivalent /api/novels comment — the raw imported file is
      // never read back, so it isn't persisted.
      coverPhoto: req.files['coverPhoto'] ? toDataUri(req.files['coverPhoto'][0]) : null
    });

    await newArticle.save();
    res.status(201).json({ message: "Article saved successfully!" });
  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ error: "Failed to save article." });
  }
});

router.get('/api/articles', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const articles = await Article.aggregate(listPipeline('article', { status: 'published' }, { page, limit, summary: true }));
    res.json(articles);
  } catch (error) { res.status(500).json({ error: "Failed to fetch articles" }); }
});

router.get('/api/articles/author/:authorId', auth, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.authorId)) return res.status(400).json({ error: "Invalid author ID" });
    const articles = await Article.aggregate(listPipeline('article', authorFilter(req), {}));
    res.json(articles);
  } catch (error) { res.status(500).json({ error: "Failed to fetch author articles" }); }
});

router.get('/api/articles/:id', optionalAuth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: "Article not found" });

    if (article.status === 'draft') {
      // Same reasoning as GET /api/novels/:id — ownership must come from the
      // verified JWT, not a spoofable ?userId= query param.
      const requesterId = req.user?._id?.toString();
      if (!article.authorId || article.authorId.toString() !== requesterId) {
        return res.status(403).json({ error: "This article is a private draft and cannot be viewed." });
      }
    }
    res.json(article);
  } catch (error) { res.status(500).json({ error: "Server error" }); }
});

router.put('/api/novels/:id', auth, async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ error: "Story not found" });

    if (!novel.authorId || novel.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied. You are not the author of this story." });
    }

    // Only author-editable fields — never authorId, views, likes, comments…
    const updateData = pick(req.body, NOVEL_EDITABLE_FIELDS);
    const updatedNovel = await Novel.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after', runValidators: true });
    res.json({ message: "Story updated!", data: updatedNovel });
  } catch (error) {
    if (isValidationError(error)) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: "Update failed" });
  }
});

router.put('/api/articles/:id', auth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: "Article not found" });

    if (!article.authorId || article.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied. You are not the author of this article." });
    }

    // Only author-editable fields — never authorId, views, likes, comments…
    const updateData = pick(req.body, ARTICLE_EDITABLE_FIELDS);
    const updatedArticle = await Article.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after', runValidators: true });
    res.json({ message: "Article updated!", data: updatedArticle });
  } catch (error) {
    if (isValidationError(error)) return res.status(400).json({ error: error.message });
    res.status(500).json({ error: "Update failed" });
  }
});


router.patch('/api/:type/:id/status', requireContentType, auth, async (req, res) => {
  const { status } = req.body;
  if (!isValidStatus(status)) {
    return res.status(400).json({ error: `Status must be one of: ${CONTENT_STATUSES.join(', ')}.` });
  }
  const Model = MODELS[req.params.type];
  try {
    const item = await Model.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Content not found" });
    if (!item.authorId || item.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied. You are not the author of this content." });
    }
    item.status = status;
    await item.save();
    res.json({ message: "Status updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

router.delete('/api/novels/:id', auth, async (req, res) => {
  try {
    const novel = await Novel.findById(req.params.id);
    if (!novel) return res.status(404).json({ error: "Story not found" });
    if (!novel.authorId || novel.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied. You are not the author of this story." });
    }
    await Novel.findByIdAndDelete(req.params.id);
    res.json({ message: "Story deleted successfully" });
  } catch (error) { res.status(500).json({ error: "Delete failed" }); }
});

router.delete('/api/articles/:id', auth, async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: "Article not found" });
    if (!article.authorId || article.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied. You are not the author of this article." });
    }
    await Article.findByIdAndDelete(req.params.id);
    res.json({ message: "Article deleted successfully" });
  } catch (error) { res.status(500).json({ error: "Delete failed" }); }
});

router.post('/api/:type/:id/like', requireContentType, auth, async (req, res) => {
  const userId = req.user._id.toString();
  const Model = MODELS[req.params.type];
  const displayType = req.params.type === 'novel' ? 'story' : req.params.type;
  try {
    const item = await Model.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Content not found" });

    const likerName = req.user.username || "A reader";
    const isLiking = !item.likes.includes(userId);
    
    if (isLiking) {
      item.likes.push(userId);
      if (item.authorId && item.authorId.toString() !== userId) {
        const newNotif = new Notification({
          recipient: item.authorId,
          sender: userId,
          type: 'like',
          contentId: item._id,
          contentType: req.params.type,
          message: `${likerName} liked your ${displayType}: "${item.title}"`
        });
        await newNotif.save();
      } 
    } else {
      item.likes.pull(userId);
    }

    await item.save();
    res.json({ likesCount: item.likes.length });
  } catch (err) {
    console.error("Like error:", err);
    res.status(500).json({ error: "Failed to update like." });
  }
});

router.post('/api/:type/:id/comment', requireContentType, auth, async (req, res) => {
  const { text } = req.body;
  const textError = commentTextError(text);
  if (textError) return res.status(400).json({ error: textError });
  const userId = req.user._id.toString();
  const username = req.user.username;
  const Model = MODELS[req.params.type];
  const displayType = req.params.type === 'novel' ? 'story' : req.params.type;
  try {
    const item = await Model.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Content not found" });

    const newComment = {
      userId,
      username,
      text: text.trim(),
      createdAt: new Date(),
      replies: []
    };

    item.comments.push(newComment);
    await item.save();
    const savedComment = item.comments[item.comments.length - 1];

    // Trigger Notification: notify the author if another reader leaves a comment
    if (item.authorId && item.authorId.toString() !== userId) {
      const newNotif = new Notification({
        recipient: item.authorId,
        sender: userId,
        type: 'comment',
        contentId: item._id,
        contentType: req.params.type,
        commentId: savedComment._id,
        message: `${username} commented on your ${displayType}: "${item.title}"`
      });
      await newNotif.save();
    }

    res.json(item.comments);
  } catch (err) {
    console.error("Comment Error:", err);
    res.status(500).json({ error: "Failed to post comment." });
  }
});

router.post('/api/:type/:id/comment/:commentId/reply', requireContentType, auth, async (req, res) => {
  const { text } = req.body;
  const textError = commentTextError(text);
  if (textError) return res.status(400).json({ error: textError });
  const userId = req.user._id.toString();
  const username = req.user.username;
  const Model = MODELS[req.params.type];
  const displayType = req.params.type === 'novel' ? 'story' : req.params.type;
  try {
    const item = await Model.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Content not found" });

    const comment = item.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const newReply = {
      userId,
      username,
      text: text.trim(),
      createdAt: new Date()
    };

    if (!comment.replies) {
      comment.replies = [];
    }
    comment.replies.push(newReply);
    await item.save();
    const savedReply = comment.replies[comment.replies.length - 1];

    // Trigger Notification: notify the comment author
    if (comment.userId && comment.userId.toString() !== userId) {
      const newNotif = new Notification({
        recipient: comment.userId,
        sender: userId,
        type: 'reply',
        contentId: item._id,
        contentType: req.params.type,
        commentId: comment._id,
        replyId: savedReply._id,
        message: `${username} replied to your comment on "${item.title}"`
      });
      await newNotif.save();
    }

    // Trigger Notification: notify the novel/article author (if they are a different person)
    if (item.authorId && item.authorId.toString() !== userId && item.authorId.toString() !== comment.userId?.toString()) {
      const newNotif = new Notification({
        recipient: item.authorId,
        sender: userId,
        type: 'reply',
        contentId: item._id,
        contentType: req.params.type,
        commentId: comment._id,
        replyId: savedReply._id,
        message: `${username} replied to a comment on your ${displayType}: "${item.title}"`
      });
      await newNotif.save();
    }

    res.json(item.comments);
  } catch (err) {
    console.error("Reply Error:", err);
    res.status(500).json({ error: "Failed to post reply." });
  }
});

// Delete a comment (either work author or comment author can delete)
router.delete('/api/:type/:id/comment/:commentId', requireContentType, auth, async (req, res) => {
  const { type, id, commentId } = req.params;
  const userId = req.user._id.toString();
  const Model = MODELS[type];
  try {
    const item = await Model.findById(id);
    if (!item) return res.status(404).json({ error: "Content not found" });

    const comment = item.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const isCommentAuthor = comment.userId && comment.userId.toString() === userId;
    const isWorkAuthor = item.authorId && item.authorId.toString() === userId;

    if (!isCommentAuthor && !isWorkAuthor) {
      return res.status(403).json({ error: "Unauthorized to delete this comment" });
    }

    item.comments.pull(commentId);
    await item.save();
    res.json(item.comments);
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Failed to delete comment." });
  }
});

// Delete a reply (either work author or reply author can delete)
router.delete('/api/:type/:id/comment/:commentId/reply/:replyId', requireContentType, auth, async (req, res) => {
  const { type, id, commentId, replyId } = req.params;
  const userId = req.user._id.toString();
  const Model = MODELS[type];
  try {
    const item = await Model.findById(id);
    if (!item) return res.status(404).json({ error: "Content not found" });

    const comment = item.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const reply = comment.replies.id(replyId);
    if (!reply) return res.status(404).json({ error: "Reply not found" });

    const isReplyAuthor = reply.userId && reply.userId.toString() === userId;
    const isWorkAuthor = item.authorId && item.authorId.toString() === userId;

    if (!isReplyAuthor && !isWorkAuthor) {
      return res.status(403).json({ error: "Unauthorized to delete this reply" });
    }

    comment.replies.pull(replyId);
    await item.save();
    res.json(item.comments);
  } catch (err) {
    console.error("Delete reply error:", err);
    res.status(500).json({ error: "Failed to delete reply." });
  }
});

module.exports = router;
