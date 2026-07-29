// Single source of truth for the backend origin.
// Set REACT_APP_API_URL in the environment (e.g. Vercel project settings) to
// point the deployed frontend at the deployed backend. Falls back to the
// local dev server so nothing changes for `npm start`.
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
