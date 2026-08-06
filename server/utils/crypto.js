const crypto = require('crypto');

// Encrypts message text at rest (AES-256-GCM) so a raw database dump can't be
// read in plaintext. Unlike password hashing, this must be reversible — the
// sender/receiver need the original text back, not just a match check.
//
// The key is derived from JWT_SECRET (already a required env var) via scrypt,
// so no new secret needs to be configured.

let cachedKey = null;
function getKey() {
  if (!cachedKey) {
    cachedKey = crypto.scryptSync(process.env.JWT_SECRET, 'lumiverse-message-encryption', 32);
  }
  return cachedKey;
}

function encryptText(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptText(stored) {
  if (typeof stored !== 'string') return stored;
  const parts = stored.split(':');
  if (parts.length !== 3) return stored; // not our format — legacy/plaintext value, pass through

  try {
    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    // Corrupted, tampered, or genuinely legacy plaintext — fail safe rather
    // than crash the request; surface the raw stored value.
    return stored;
  }
}

module.exports = { encryptText, decryptText };
