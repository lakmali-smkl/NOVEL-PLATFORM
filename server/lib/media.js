// Cover images are stored on Novel/Article documents as base64 data: URIs
// (up to ~5MB each). Sending those inside list responses made every listing
// page download every cover in one giant JSON payload. Instead, list
// endpoints return a short URL and the browser fetches (and caches) each
// image separately from GET /api/media/:type/:id/cover.

// Relative path, so the client's resolveMediaUrl() prefixes it with the API
// origin exactly like legacy "uploads/..." paths.
const coverUrl = (type, id) => `api/media/${type}/${id}/cover`;

// Mongo expression: the cover URL when the document has a cover, else null.
// Evaluated in the database, so the image bytes never leave MongoDB.
const coverUrlExpr = (type) => ({
  $cond: [
    { $gt: [{ $strLenBytes: { $ifNull: ['$coverPhoto', ''] } }, 0] },
    { $concat: [`api/media/${type}/`, { $toString: '$_id' }, '/cover'] },
    null
  ]
});

// Replaces a document's stored cover with its URL (for already-loaded docs).
const withCoverUrl = (doc, type) => {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  obj.coverPhoto = obj.coverPhoto ? coverUrl(type, obj._id) : null;
  return obj;
};

// Parses "data:<mime>;base64,<payload>" into { mime, buffer }, or null.
const parseDataUri = (value) => {
  const match = /^data:([\w/+.-]+);base64,(.*)$/s.exec(value || '');
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
};

module.exports = { coverUrl, coverUrlExpr, withCoverUrl, parseDataUri };
