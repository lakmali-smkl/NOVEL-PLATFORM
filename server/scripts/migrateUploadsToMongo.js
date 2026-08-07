// One-off migration: reads locally-stored upload files (the old
// multer.diskStorage format, e.g. "uploads/167xxx-name.jpg") and rewrites
// the matching MongoDB fields to hold the image as a self-contained
// data: URI instead — the same format the app now writes for new uploads
// (see server.js's toDataUri / the upload routes).
//
// Safe to re-run: any field that's already a data: URI (or empty) is left
// untouched, so running this twice does nothing extra the second time.
//
// Usage:
//   node scripts/migrateUploadsToMongo.js --dry-run   (report only, no writes)
//   node scripts/migrateUploadsToMongo.js             (actually migrate)
//
// Must be run from a machine that has the original server/uploads/ files —
// this reads them off local disk. Connects using MONGO_URI from .env, which
// is the same live database the deployed app uses.

require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // same SRV-lookup workaround as server.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');
const Novel = require('../models/Novel');
const Article = require('../models/Article');

const DRY_RUN = process.argv.includes('--dry-run');

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const isLegacyPath = (value) =>
  typeof value === 'string' && value.length > 0 && !value.startsWith('data:');

function fileToDataUri(relativePath) {
  const absPath = path.join(__dirname, '..', relativePath);
  if (!fs.existsSync(absPath)) return { error: 'FILE_NOT_FOUND' };

  const ext = path.extname(absPath).toLowerCase();
  const mimeType = MIME_TYPES[ext];
  if (!mimeType) return { error: `UNSUPPORTED_EXTENSION(${ext})` };

  const buffer = fs.readFileSync(absPath);
  return { dataUri: `data:${mimeType};base64,${buffer.toString('base64')}` };
}

async function migrateField(Model, fieldName) {
  const docs = await Model.find({ [fieldName]: { $exists: true, $ne: '' } }).select(`_id ${fieldName}`);
  let migrated = 0, missing = 0, skipped = 0;

  for (const doc of docs) {
    const value = doc[fieldName];
    if (!isLegacyPath(value)) { skipped++; continue; }

    const result = fileToDataUri(value);
    if (result.error) {
      console.warn(`  ⚠ ${Model.modelName} ${doc._id}: ${result.error} (${value})`);
      missing++;
      continue;
    }

    if (!DRY_RUN) {
      doc[fieldName] = result.dataUri;
      await doc.save();
    }
    migrated++;
  }

  console.log(`${Model.modelName}.${fieldName}: ${migrated} ${DRY_RUN ? 'would be migrated' : 'migrated'}, ${missing} missing files, ${skipped} already done/empty`);
}

async function migrateReadingHistory() {
  const users = await User.find({ 'readingHistory.0': { $exists: true } });
  let migrated = 0, missing = 0;

  for (const user of users) {
    let changed = false;
    for (const item of user.readingHistory) {
      if (!isLegacyPath(item.coverPhoto)) continue;

      const result = fileToDataUri(item.coverPhoto);
      if (result.error) {
        console.warn(`  ⚠ User ${user._id} readingHistory item ${item.contentId}: ${result.error} (${item.coverPhoto})`);
        missing++;
        continue;
      }

      if (!DRY_RUN) item.coverPhoto = result.dataUri;
      changed = true;
      migrated++;
    }
    if (changed && !DRY_RUN) await user.save();
  }

  console.log(`User.readingHistory[].coverPhoto: ${migrated} ${DRY_RUN ? 'would be migrated' : 'migrated'}, ${missing} missing files`);
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set. Run this from server/ with the same .env the backend uses.');
    process.exit(1);
  }

  console.log(DRY_RUN ? '=== DRY RUN — no writes will be made ===' : '=== LIVE RUN — this will modify the database ===');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.\n');

  await migrateField(User, 'profilePicture');
  await migrateField(Novel, 'coverPhoto');
  await migrateField(Article, 'coverPhoto');
  await migrateReadingHistory();

  console.log('\nDone.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
