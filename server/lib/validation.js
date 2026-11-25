const mongoose = require('mongoose');

// Escapes user input so it can be embedded in a RegExp / Mongo $regex as a
// literal string. Without this, input like "(a+)+$" can hang the database
// (ReDoS) and ".*" matches every record.
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Returns a new object containing only the allowed keys that are present in
// `source`. Used to stop clients from writing fields such as authorId, views,
// likes or comments through generic update endpoints (mass assignment).
const pick = (source, allowedKeys) => {
  const out = {};
  if (!source || typeof source !== 'object') return out;
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      out[key] = source[key];
    }
  }
  return out;
};

// Fields an author may change on their own work via PUT.
const NOVEL_EDITABLE_FIELDS = ['title', 'content', 'authorSpeech', 'status', 'genre'];
const ARTICLE_EDITABLE_FIELDS = ['title', 'content', 'status', 'category'];

const CONTENT_STATUSES = ['draft', 'published'];
const isValidStatus = (status) => CONTENT_STATUSES.includes(status);

// The ':type' URL segment used by the shared like/comment/status routes.
const CONTENT_TYPES = ['novel', 'article'];
const isValidContentType = (type) => CONTENT_TYPES.includes(type);

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Usernames: 3–30 chars, letters (any language)/numbers/underscore/dot/hyphen.
// No spaces or slashes, so they stay safe in URLs
// (/api/users/by-username/:username) and unambiguous.
const USERNAME_PATTERN = /^[\p{L}\p{M}\p{N}_.-]{3,30}$/u;
const validateUsername = (username) => {
  if (typeof username !== 'string' || !username.trim()) return 'Username is required.';
  if (!USERNAME_PATTERN.test(username.trim())) {
    return 'Username must be 3–30 characters and use only letters, numbers, ".", "_" or "-".';
  }
  return null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (email) => typeof email === 'string' && EMAIL_PATTERN.test(email.trim());

const MIN_PASSWORD_LENGTH = 6;
const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
};

// Case-insensitive exact-match filter for a username lookup.
const usernameFilter = (username) => ({
  username: { $regex: `^${escapeRegex(username.trim())}$`, $options: 'i' }
});

module.exports = {
  escapeRegex,
  pick,
  NOVEL_EDITABLE_FIELDS,
  ARTICLE_EDITABLE_FIELDS,
  CONTENT_STATUSES,
  isValidStatus,
  CONTENT_TYPES,
  isValidContentType,
  isValidObjectId,
  validateUsername,
  isValidEmail,
  validatePassword,
  usernameFilter,
};
