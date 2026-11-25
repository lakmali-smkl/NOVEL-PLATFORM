// One-off cleanup for data written before the Nov 2026 fixes:
//
// 1. Announcements: the TTL option on `expiresAt` was misspelled
//    ("expiresAfterSeconds"), so MongoDB never auto-deleted expired
//    announcements. If a plain (non-TTL) `expiresAt_1` index exists it
//    blocks the corrected TTL index from being created, so it is dropped
//    and recreated with expireAfterSeconds: 0.
// 2. Builds the new indexes declared on the models (novels, articles,
//    notifications, collections, writer requests). Existing indexes are
//    left alone — nothing else is dropped.
// 3. Users: reading-history entries used to store a full base64 copy of
//    each cover image. Those copies are removed (covers are now looked up
//    from the story/article itself), shrinking user documents.
//
// Safe to re-run: every step checks the current state first.
//
// Usage:
//   node scripts/fixIndexesAndHistory.js --dry-run   (report only, no writes)
//   node scripts/fixIndexesAndHistory.js             (apply)
//
// Connects using MONGO_URI from .env — the same live database the deployed
// app uses, so run --dry-run first.

require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // same SRV-lookup workaround as server.js
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Novel = require('../models/Novel');
const Article = require('../models/Article');
const Notification = require('../models/Notification');
const Collection = require('../models/Collection');
const WriterRequest = require('../models/WriterRequest');
const User = require('../models/User');

const DRY_RUN = process.argv.includes('--dry-run');

async function fixAnnouncementTtl() {
  const indexes = await Announcement.collection.indexes().catch((err) => {
    if (err.codeName === 'NamespaceNotFound') return [];
    throw err;
  });
  const existing = indexes.find((i) => i.key && i.key.expiresAt === 1);
  if (existing && existing.expireAfterSeconds === 0) {
    console.log('Announcements: TTL index already correct.');
    return;
  }
  if (existing) {
    console.log(`Announcements: dropping non-TTL index "${existing.name}".`);
    if (!DRY_RUN) await Announcement.collection.dropIndex(existing.name);
  }
  console.log('Announcements: creating TTL index on expiresAt.');
  if (!DRY_RUN) await Announcement.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

async function buildModelIndexes() {
  for (const Model of [Novel, Article, Notification, Collection, WriterRequest]) {
    console.log(`${Model.modelName}: ensuring indexes ${JSON.stringify(Model.schema.indexes().map(([k]) => k))}`);
    if (!DRY_RUN) await Model.createIndexes();
  }
}

async function stripHistoryCovers() {
  const filter = { 'readingHistory.coverPhoto': { $exists: true } };
  const count = await User.countDocuments(filter);
  console.log(`Users: ${count} with cover images stored in reading history.`);
  if (count && !DRY_RUN) {
    const result = await User.updateMany(filter, { $unset: { 'readingHistory.$[].coverPhoto': '' } });
    console.log(`Users: cleaned ${result.modifiedCount}.`);
  }
}

(async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set.');
    process.exit(1);
  }
  // Index creation is done explicitly below, not by Mongoose on connect.
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
  console.log(DRY_RUN ? '--- DRY RUN: no changes will be written ---' : '--- Applying changes ---');
  try {
    await fixAnnouncementTtl();
    await buildModelIndexes();
    await stripHistoryCovers();
    console.log('Done.');
  } finally {
    await mongoose.disconnect();
  }
})().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
