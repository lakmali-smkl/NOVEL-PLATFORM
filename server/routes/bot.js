const express = require('express');
const Novel = require('../models/Novel');
const Article = require('../models/Article');

const router = express.Router();

// ==========================================
// 🤖 CHATBOT LIBRARY ASSISTANT
// ==========================================
router.post('/api/bot/message', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const msg = message.toLowerCase().trim();
    let reply = "";
    let suggestions = [];

    // Helper: check if msg contains ANY of the keywords
    const has = (...keywords) => keywords.some(k => msg.includes(k));

    // ── Greetings ──
    if (has('hi', 'hello', 'hey', 'hola', 'greet', 'good morning', 'good evening', 'good afternoon', 'howdy', 'sup', 'whats up', "what's up")) {
      reply = "Hello! 👋 I'm your Library Helper chatbot.\n\nI can help you:\n📚 Find stories to read\n✍️ Learn how to write & publish\n🎨 Change your theme\n❤️ Save favorites\n💬 Message authors\n🔑 Account & login help\n\nWhat would you like to know?";
    }

    // ── Story Suggestions / Recommendations ──
    else if (has('suggest', 'recommend', 'what should i read', 'what to read', 'pick a book', 'pick a novel', 'good book', 'good novel', 'popular', 'top story', 'best novel', 'best story', 'best book')) {
      const novels = await Novel.find({ status: 'published' }).sort({ views: -1 }).limit(4);
      const articles = await Article.find({ status: 'published' }).sort({ views: -1 }).limit(2);
      reply = novels.length + articles.length > 0
        ? "Here are some top picks from our library! 📚 Click any title to start reading:"
        : "Our library is growing! No published stories yet — but check back soon. In the meantime, explore the Library section from the sidebar!";
      suggestions = [
        ...novels.map(n => ({ _id: n._id, title: n.title, type: 'novel', author: n.author })),
        ...articles.map(a => ({ _id: a._id, title: a.title, type: 'article', author: a.author }))
      ];
    }

    // ── Browse / Explore Library ──
    else if (has('browse', 'explore', 'library', 'find book', 'find novel', 'search book', 'search story', 'discover', 'what is available', 'what can i read', 'catalog')) {
      const count = await Novel.countDocuments({ status: 'published' }) + await Article.countDocuments({ status: 'published' });
      reply = `Our library currently has ${count} published works! 🏛️\n\nTo browse:\n1. Use the 'Library' link in the sidebar\n2. Filter by genre, type (story/article), or author\n3. Use the search bar at the top to find specific titles\n4. Check the '🔥 Trending Now' section on the home page`;
    }

    // ── Genres ──
    else if (has('genre', 'fantasy', 'romance', 'thriller', 'mystery', 'sci-fi', 'science fiction', 'horror', 'adventure', 'comedy', 'drama', 'historical', 'action')) {
      const novels = await Novel.find({ status: 'published' }).limit(3);
      reply = "We support many genres! 🎭\n\nAvailable genres include:\n📖 Fantasy  •  💕 Romance  •  🔍 Mystery\n🚀 Sci-Fi  •  😱 Horror  •  ⚔️ Adventure\n😂 Comedy  •  🎭 Drama  •  🏛️ Historical\n\nYou can filter by genre in the Library section. Here are some current picks:";
      suggestions = novels.map(n => ({ _id: n._id, title: n.title, type: 'novel', author: n.author }));
    }

    // ── Become a Writer ──
    else if (has('become a writer', 'how to write', 'how do i write', 'want to write', 'start writing', 'apply writer', 'writer application', 'can i publish', 'how to publish', 'create story', 'write a novel', 'write a story')) {
      reply = "Becoming a writer is easy! ✍️\n\nSteps:\n1. Go to your Reader Portal (home page)\n2. Open the sidebar and click '✍️ Become a Writer'\n3. Submit your application\n4. Wait for Admin approval (usually quick!)\n5. Once approved, you'll see the 'Writer Portal' in the sidebar\n\nIn the Writer Portal you can:\n📖 Publish stories with chapters\n📝 Publish articles\n📊 Track views, likes & comments\n📢 Create announcements";
    }

    // ── Writer Dashboard / Portal ──
    else if (has('writer dashboard', 'writer portal', 'writer panel', 'manage story', 'manage novel', 'edit story', 'edit novel', 'update chapter', 'add chapter', 'upload chapter')) {
      reply = "The Writer Portal is your creative hub! 🖊️\n\nFrom the Writer Portal sidebar you can:\n📖 Create & manage Stories (add chapters, cover art)\n📝 Write & publish Articles\n📊 View your story analytics (views, likes, comments)\n💬 Read & reply to reader comments\n📢 Post Announcements to your readers\n\nAccess it from the left sidebar after becoming an approved writer.";
    }

    // ── Comments & Reviews ──
    else if (has('comment', 'review', 'leave a review', 'rate', 'rating', 'feedback', 'opinion', 'reply to comment')) {
      reply = "Interacting with stories is easy! 💬\n\nTo leave a comment:\n1. Open any story chapter or article\n2. Scroll to the bottom\n3. Type in the comment box and hit 'Post'\n\nYou can also:\n↩️ Reply to other readers' comments\n❤️ Like a story by clicking the heart button\n🗑️ Delete your own comments anytime\n\nWriters can also delete any comments on their own stories.";
    }

    // ── Likes & Favorites ──
    else if (has('like', 'unlike', 'heart', 'favorite', 'favourit', 'save story', 'save novel', 'bookmark', 'save for later', 'wish list', 'saved')) {
      reply = "Saving stories is super easy! ❤️\n\nTo Favorite a story:\n• Click the ❤️ heart button on any story page\n\nTo view your Favorites:\n• Sidebar → 'Favorites' section\n• Filter by All / Stories / Articles using the tabs\n\nTo organize into Collections:\n• Click '+ Add to Collection' on any story\n• Create custom named shelves\n• Find them under sidebar → 'My Library'";
    }

    // ── Collections / Shelves ──
    else if (has('collection', 'shelf', 'shelve', 'organize', 'folder', 'list', 'my list', 'reading list', 'read later')) {
      reply = "Collections let you organize your reading! 📁\n\nHow to use Collections:\n1. Open any story page\n2. Click 'Add to Collection'\n3. Create a new collection or add to existing\n\nYour collections appear in the sidebar under 'Library' → 'Collections'. Great for organizing by genre, mood, or reading priority!";
    }

    // ── Reading History ──
    else if (has('history', 'reading history', 'read before', 'previously read', 'continue reading', 'last read', 'resume', 'where was i')) {
      reply = "Your reading history is automatically saved! 📖\n\nTo access it:\n• Sidebar → 'Reading History'\n\nYour history shows:\n🕒 Recently read stories\n📄 Which chapter you last read\n⏱️ Approximate reading progress\n\nClick any item to jump back to where you left off!";
    }

    // ── Login / Sign In ──
    else if (has('login', 'sign in', 'log in', 'cant login', "can't login", 'login problem', 'login error', 'forgot login')) {
      reply = "Having trouble logging in? 🔑\n\nTry these steps:\n1. Make sure your username and password are correct\n2. Check if CAPS LOCK is on\n3. If you forgot your password, contact the admin\n\nTo log in:\n• Go to the Login page from the navbar or home page\n• Enter your username and password\n• Click 'Login'\n\nNew here? Click 'Sign Up' to create a free account!";
    }

    // ── Register / Sign Up ──
    else if (has('register', 'sign up', 'signup', 'create account', 'new account', 'join', 'get started', 'how to join')) {
      reply = "Creating an account is free and instant! 🎉\n\nTo register:\n1. Click 'Sign Up' on the home page or navbar\n2. Choose a unique username\n3. Enter your email and password\n4. Click 'Register'\n\nOnce registered you can:\n📚 Read all published stories\n❤️ Save favorites & collections\n💬 Comment and interact\n✍️ Apply to become a writer!";
    }

    // ── Account Settings / Profile ──
    else if (has('profile', 'account', 'setting', 'change password', 'update email', 'edit profile', 'my account', 'account info', 'username')) {
      reply = "Managing your account is simple! ⚙️\n\nTo access Settings:\n• Click your avatar/name in the top-right navbar\n• Or go to Sidebar → 'Settings'\n\nIn Settings you can:\n👤 Edit your profile name & bio\n🔒 Change your password\n🎨 Switch your platform theme\n🔔 Manage notification preferences";
    }

    // ── Themes & Appearance ──
    else if (has('theme', 'color', 'dark mode', 'light mode', 'dark theme', 'light theme', 'appearance', 'change color', 'change theme', 'night mode', 'day mode', 'midnight', 'ocean', 'forest', 'purple', 'sunset', 'snow')) {
      reply = "We have 6 stunning themes! 🎨\n\n🌑 Midnight — Deep dark mode\n❄️ Snow — Clean light mode\n🌊 Ocean — Cool blue tones\n🌲 Forest — Natural green tones\n💜 Purple — Rich purple accents\n🌅 Sunset — Warm orange/red tones\n\nTo switch:\n• Click the 🎨 color indicator in the top-right navbar\n• Or go to Settings → Appearance → select a theme card";
    }

    // ── Direct Messages / Chat with Writers ──
    else if (has('message', 'chat', 'dm', 'direct message', 'contact writer', 'talk to writer', 'message author', 'message writer', 'inbox', 'conversation')) {
      reply = "You can chat directly with any writer! 💬\n\nTo message a writer:\n1. Open any of their stories\n2. Click the '💬 Message Writer' button near their name\n\nTo see all your conversations:\n• Sidebar → 'Messages'\n• View unread counts and switch between chats\n\nWriters can also message you back through the same system!";
    }

    // ── Announcements ──
    else if (has('announcement', 'announce', 'news', 'update', 'notification', 'notice', 'platform news')) {
      reply = "Stay up to date with platform news! 📢\n\nAnnouncements appear:\n• On your home dashboard (as highlighted cards at the top)\n• Writers can post announcements to their own readers\n• Admins post platform-wide announcements\n\nCheck the home page regularly for the latest updates!";
    }

    // ── Admin / Moderation ──
    else if (has('admin', 'administrator', 'report', 'ban', 'abuse', 'inappropriate', 'content policy', 'violation', 'moderate', 'moderation')) {
      reply = "For platform issues or content concerns: 🛡️\n\nContent Policy:\n• All published content is reviewed by admins\n• Inappropriate content can be reported\n• Writers must follow community guidelines\n\nAdmin features include:\n👥 Managing users and writer approvals\n📚 Reviewing published content\n📢 Posting platform-wide announcements\n\nIf you have a serious concern, contact the platform administrator directly.";
    }

    // ── Search ──
    else if (has('search', 'how to search', 'find', 'look for', 'look up', 'query')) {
      reply = "Finding stories is easy! 🔍\n\nWays to discover content:\n1. Use the Search bar at the top of the Library page\n2. Filter by genre, type (story/article), or date\n3. Browse the '🔥 Trending Now' section on home\n4. Check '✨ AI Recommendations' on your dashboard\n5. Ask me: 'Suggest a story' and I'll pull from the database!";
    }

    // ── Reading Progress / Chapters ──
    else if (has('chapter', 'next chapter', 'previous chapter', 'chapter list', 'table of content', 'toc', 'progress', 'continue', 'page')) {
      reply = "Navigating chapters is intuitive! 📑\n\nInside a story:\n• Use 'Next Chapter' / 'Previous Chapter' buttons at the bottom\n• Click the chapter name in the header to see the full chapter list\n• Your progress is auto-saved so you can continue anytime\n\nTo resume reading:\n• Sidebar → 'Reading History' → click the story to jump back in";
    }

    // ── What is this site / About ──
    else if (has('what is this', 'about', 'what can i do', 'platform', 'site', 'website', 'this app', 'how does this work', 'features')) {
      reply = "Welcome to Lumiverse! 📖✨\n\nThis is a site for publishing creative works, where:\n\n👀 Readers can:\n• Browse and read stories & articles\n• Save favorites and organize collections\n• Comment, like and interact with writers\n• Get AI-powered personalized recommendations\n\n✍️ Writers can:\n• Publish stories (with chapters) & articles\n• Track views, likes and reader engagement\n• Chat directly with readers\n• Post announcements\n\nEverything is themed, personalized, and designed for book lovers!";
    }

    // ── Help / General ──
    else if (has('help', 'support', 'how do i', 'how to', 'guide', 'tutorial', 'instructions', 'explain', 'what', 'show me')) {
      reply = "I'm here to help! 🤖 Here's what I can assist with:\n\n📚 Stories — 'Suggest a story' or 'Browse library'\n✍️ Writing — 'How to become a writer'\n🎨 Themes — 'Change my theme'\n❤️ Saving — 'How to favorite a story'\n💬 Messaging — 'How to chat with writers'\n🔑 Account — 'Login help' or 'Change password'\n📖 Reading — 'View my reading history'\n🏷️ Genres — 'Show me fantasy stories'\n\nJust ask naturally — I understand plain language!";
    }

    // ── Thank you ──
    else if (has('thank', 'thanks', 'thank you', 'thx', 'ty', 'great', 'awesome', 'perfect', 'nice', 'good job', 'well done', 'helpful')) {
      reply = "You're very welcome! 😊\n\nHappy reading! If you have any more questions, I'm always here. Don't forget to explore the library and discover your next favorite story! 📚✨";
    }

    // ── Goodbye ──
    else if (has('bye', 'goodbye', 'see you', 'later', 'cya', 'exit', 'close', 'quit')) {
      reply = "Goodbye! 👋 Happy reading! Come back anytime you need help. The library awaits! 📚";
    }

    // ── Default fallback ──
    else {
      reply = `I'm not sure I understood "${message.length > 30 ? message.substring(0, 30) + '...' : message}", but I'm happy to help! 🤖\n\nTry asking about:\n📚 "Suggest a story to read"\n✍️ "How do I become a writer?"\n🎨 "How do I change my theme?"\n❤️ "How do I save a favorite?"\n💬 "How to message an author?"\n🔑 "I forgot my password"\n📖 "What is this platform about?"\n\nOr use the quick buttons below!`;
    }

    res.json({ reply, suggestions });
  } catch (error) {
    console.error("Bot API error:", error);
    res.status(500).json({ error: "Server error processing chatbot message" });
  }
});

module.exports = router;
