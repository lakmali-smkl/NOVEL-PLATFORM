require('dotenv').config();

// Fail fast rather than silently falling back to a guessable secret in production
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error('FATAL: MONGO_URI environment variable is not set. Refusing to start.');
  process.exit(1);
}

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const app = require('./app');

// Routes live in routes/*.js, shared helpers in lib/, and the Express app
// itself is assembled in app.js.

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB librarydb!'))
  .catch((err) => console.error('Could not connect to MongoDB:', err));

// ==========================================
// SERVER SPIN UP
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Log unexpected errors. An uncaught exception leaves the process in an undefined
// state, so we log and exit rather than limp along — pm2 (see ecosystem.config.js)
// restarts it immediately.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
