// Builds the Express app. Kept separate from server.js (which connects to
// MongoDB and listens) so tests can load the app without a database.
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { MAX_UPLOAD_BYTES } = require('./lib/upload');

const app = express();

app.use(helmet({
  // Cover photos/avatars are loaded cross-origin by the frontend
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Comma-separated list of allowed frontend origins, e.g.
// "https://your-app.vercel.app,http://localhost:3000"
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Story edits send the whole text as JSON; the 100kb default rejected long chapters.
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate-limit auth endpoints against brute-forcing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Please try again later.' },
});
app.use(['/login', '/register', '/api/forgot-password'], authLimiter);

// Order matters where paths overlap: routers are tried in this order, the
// same order the routes had in the original single-file server.
app.use('/api/admin', require('./routes/admin'));
app.use(require('./routes/auth'));
app.use(require('./routes/users'));
app.use(require('./routes/content'));
app.use(require('./routes/notifications'));
app.use(require('./routes/announcements'));
app.use(require('./routes/collections'));
app.use(require('./routes/recommendations'));
app.use(require('./routes/messages'));
app.use(require('./routes/bot'));

// Unknown API paths get a JSON 404 rather than the React app's index.html.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'API route not found.' });
});

// ==========================================
// SERVE REACT BUILD (single-service deployments, e.g. Render)
// ==========================================
// No-op locally / in split deployments where client/build doesn't exist —
// only kicks in when the client has actually been built alongside the server.
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  // Pathless catch-all (not app.get('*', ...)) — Express 5's path-to-regexp
  // requires named wildcards for string patterns, so a bare '*' throws at
  // startup. This only runs when nothing above it (API routes) matched.
  app.use((req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================
// Catches anything passed to next(err) — chiefly multer rejecting an upload
// (bad file type / over the size limit) — and responds with clean JSON
// instead of Express's default HTML error page, which echoes the stack
// trace (internal file paths, code structure) straight to the client.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const mb = MAX_UPLOAD_BYTES / (1024 * 1024);
      return res.status(413).json({ error: 'FILE_TOO_LARGE', message: `File exceeds the ${mb}MB upload limit.` });
    }
    return res.status(400).json({ error: 'UPLOAD_ERROR', message: err.message });
  }
  if (err && err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: 'INVALID_FILE_TYPE', message: err.message });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: 'Request is too large.' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'INVALID_JSON', message: 'Request body is not valid JSON.' });
  }
  console.error('Unhandled route error:', err);
  res.status(500).json({ error: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
});

module.exports = app;
