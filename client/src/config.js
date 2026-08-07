// Single source of truth for the backend origin.
// Set REACT_APP_API_URL in the environment (e.g. Vercel project settings) to
// point the deployed frontend at the deployed backend. Falls back to the
// local dev server so nothing changes for `npm start`.
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Resolves a stored cover photo / profile picture to a usable <img src>.
// New uploads are stored as a full data: URI (in MongoDB, so they survive
// deploys on hosts with ephemeral disk like Render). Older records still
// hold a relative path served from the backend's /uploads folder — those
// are passed through the old behavior so existing images don't break.
export const resolveMediaUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('data:')) return value;
  return `${API_BASE_URL}/${value}`;
};
