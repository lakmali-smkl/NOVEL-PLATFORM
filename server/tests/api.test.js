// API tests against a real (in-memory) MongoDB. Covers the security and
// correctness fixes: mass assignment, status/type validation, regex
// escaping, username rules, account enumeration, cover handling, etc.
//
// mongodb-memory-server downloads a MongoDB binary on first run. To reuse an
// installed one instead, set MONGOMS_SYSTEM_BINARY to its mongod path.

process.env.JWT_SECRET = 'test-only-secret';

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../app');
const User = require('../models/User');
const Novel = require('../models/Novel');
const Announcement = require('../models/Announcement');

jest.setTimeout(120000);

// 1x1 transparent PNG
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const PNG_DATA_URI = `data:image/png;base64,${PNG_BASE64}`;

let mongod;

const tokenFor = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET);
const bearer = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });

const createUser = async (overrides = {}) => User.create({
  username: 'alice',
  email: 'alice@example.com',
  password: await bcrypt.hash('secret123', 4),
  hintQuestion: "What's your spirit animal?",
  hintAnswer: await bcrypt.hash('owl', 4),
  ...overrides,
});

const createNovel = (author, overrides = {}) => Novel.create({
  title: 'My Story',
  content: 'x'.repeat(1000),
  author: author.username,
  authorId: author._id,
  status: 'published',
  coverPhoto: PNG_DATA_URI,
  comments: [{ userId: author._id, username: author.username, text: 'hi', replies: [] }],
  ...overrides,
});

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('editing stories (mass assignment)', () => {
  test('PUT only changes author-editable fields', async () => {
    const alice = await createUser();
    const mallory = await createUser({ username: 'mallory', email: 'm@example.com' });
    const novel = await createNovel(alice, { views: 5 });

    const res = await request(app)
      .put(`/api/novels/${novel._id}`)
      .set(bearer(alice))
      .send({ title: 'Renamed', authorId: mallory._id, views: 999999, likes: [mallory._id], comments: [] });

    expect(res.status).toBe(200);
    const saved = await Novel.findById(novel._id);
    expect(saved.title).toBe('Renamed');
    expect(saved.authorId.toString()).toBe(alice._id.toString());
    expect(saved.views).toBe(5);
    expect(saved.likes).toHaveLength(0);
    expect(saved.comments).toHaveLength(1);
  });

  test('PUT rejects an invalid status with 400', async () => {
    const alice = await createUser();
    const novel = await createNovel(alice);
    const res = await request(app).put(`/api/novels/${novel._id}`).set(bearer(alice)).send({ status: 'bogus' });
    expect(res.status).toBe(400);
  });

  test('another user cannot edit', async () => {
    const alice = await createUser();
    const bob = await createUser({ username: 'bob', email: 'bob@example.com' });
    const novel = await createNovel(alice);
    const res = await request(app).put(`/api/novels/${novel._id}`).set(bearer(bob)).send({ title: 'Hacked' });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/:type/:id/status', () => {
  test('rejects unknown statuses', async () => {
    const alice = await createUser();
    const novel = await createNovel(alice);
    const res = await request(app).patch(`/api/novel/${novel._id}/status`).set(bearer(alice)).send({ status: 'nope' });
    expect(res.status).toBe(400);
  });

  test('accepts a valid status', async () => {
    const alice = await createUser();
    const novel = await createNovel(alice);
    const res = await request(app).patch(`/api/novel/${novel._id}/status`).set(bearer(alice)).send({ status: 'draft' });
    expect(res.status).toBe(200);
    expect((await Novel.findById(novel._id)).status).toBe('draft');
  });

  test('unknown content types are not treated as articles', async () => {
    const alice = await createUser();
    const res = await request(app).patch(`/api/widgets/${alice._id}/status`).set(bearer(alice)).send({ status: 'draft' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});

describe('comments', () => {
  test('empty comments are rejected', async () => {
    const alice = await createUser();
    const novel = await createNovel(alice);
    const res = await request(app).post(`/api/novel/${novel._id}/comment`).set(bearer(alice)).send({ text: '   ' });
    expect(res.status).toBe(400);
  });
});

describe('user search & lookup', () => {
  test('search is reachable (no longer shadowed by /api/users/:email)', async () => {
    await createUser();
    const res = await request(app).get('/api/users/search').query({ q: 'ali' });
    expect(res.status).toBe(200);
    expect(res.body.users.map((u) => u.username)).toEqual(['alice']);
  });

  test('search treats regex characters literally', async () => {
    await createUser();
    const wildcard = await request(app).get('/api/users/search').query({ q: '.*' });
    expect(wildcard.status).toBe(200);
    expect(wildcard.body.users).toEqual([]);

    const redos = await request(app).get('/api/users/search').query({ q: '(a+)+$' });
    expect(redos.status).toBe(200);
    expect(redos.body.users).toEqual([]);
  });

  test('by-username matches exactly (case-insensitive) and escapes input', async () => {
    await createUser();
    expect((await request(app).get('/api/users/by-username/ALICE')).status).toBe(200);
    expect((await request(app).get('/api/users/by-username/al.*')).status).toBe(404);
  });
});

describe('account updates', () => {
  test('PATCH /api/users/:id never returns password or hint hashes', async () => {
    const alice = await createUser();
    const res = await request(app).patch(`/api/users/${alice._id}`).set(bearer(alice)).send({ username: 'alice2' });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice2');
    expect(res.body.password).toBeUndefined();
    expect(res.body.hintAnswer).toBeUndefined();
  });

  test('usernames must be valid and unique', async () => {
    const alice = await createUser();
    await createUser({ username: 'bob', email: 'bob@example.com' });

    const invalid = await request(app).patch(`/api/users/${alice._id}`).set(bearer(alice)).send({ username: '' });
    expect(invalid.status).toBe(400);

    const taken = await request(app).patch(`/api/users/${alice._id}`).set(bearer(alice)).send({ username: 'BOB' });
    expect(taken.status).toBe(409);
  });
});

describe('registration', () => {
  const body = {
    username: 'carol',
    email: 'Carol@Example.com',
    password: 'secret123',
    hintQuestion: "What's your spirit animal?",
    hintAnswer: 'cat',
  };

  test('creates an account with a normalized email', async () => {
    const res = await request(app).post('/register').send(body);
    expect(res.status).toBe(201);
    expect((await User.findOne({ username: 'carol' })).email).toBe('carol@example.com');
  });

  test('rejects missing hint answer with 400 instead of crashing', async () => {
    const res = await request(app).post('/register').send({ ...body, hintAnswer: undefined });
    expect(res.status).toBe(400);
    expect(res.body.message).toBeTruthy();
  });

  test('rejects duplicate usernames and emails (case-insensitive)', async () => {
    await request(app).post('/register').send(body);
    const dupName = await request(app).post('/register').send({ ...body, email: 'other@example.com', username: 'CAROL' });
    expect(dupName.status).toBe(409);
    const dupEmail = await request(app).post('/register').send({ ...body, username: 'carol2', email: 'CAROL@example.com' });
    expect(dupEmail.status).toBe(409);
  });
});

describe('login & password reset do not reveal which emails exist', () => {
  test('unknown email and wrong password give the same login error', async () => {
    await createUser();
    const unknown = await request(app).post('/login').send({ email: 'nobody@example.com', password: 'x' });
    const wrong = await request(app).post('/login').send({ email: 'alice@example.com', password: 'wrong' });
    expect(unknown.status).toBe(wrong.status);
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  test('login rejects non-string input', async () => {
    const res = await request(app).post('/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });

  test('hint lookup returns a stable decoy for unknown emails', async () => {
    const a = await request(app).get('/api/forgot-password/hint').query({ email: 'nobody@example.com' });
    const b = await request(app).get('/api/forgot-password/hint').query({ email: 'nobody@example.com' });
    expect(a.status).toBe(200);
    expect(typeof a.body.hintQuestion).toBe('string');
    expect(a.body.hintQuestion).toBe(b.body.hintQuestion);
  });

  test('reset gives the same error for unknown email and wrong answer', async () => {
    await createUser();
    const unknown = await request(app).post('/api/forgot-password/reset')
      .send({ email: 'nobody@example.com', hintAnswer: 'owl', newPassword: 'newpass123' });
    const wrong = await request(app).post('/api/forgot-password/reset')
      .send({ email: 'alice@example.com', hintAnswer: 'cat', newPassword: 'newpass123' });
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  test('reset works with the right answer, matching email case-insensitively', async () => {
    await createUser();
    const res = await request(app).post('/api/forgot-password/reset')
      .send({ email: 'ALICE@example.com', hintAnswer: 'OWL', newPassword: 'newpass123' });
    expect(res.status).toBe(200);
    const login = await request(app).post('/login').send({ email: 'alice@example.com', password: 'newpass123' });
    expect(login.status).toBe(200);
  });
});

describe('listings & covers', () => {
  test('public list sends an excerpt and a cover URL, not the full text, comments or image', async () => {
    const alice = await createUser();
    const novel = await createNovel(alice);
    const res = await request(app).get('/api/novels');
    expect(res.status).toBe(200);
    const [item] = res.body;
    expect(item.content.length).toBeLessThanOrEqual(300);
    expect(item.comments).toBeUndefined();
    expect(item.commentCount).toBe(1);
    expect(item.coverPhoto).toBe(`api/media/novel/${novel._id}/cover`);
  });

  test('author list keeps comments for the dashboard but not the image bytes', async () => {
    const alice = await createUser();
    await createNovel(alice);
    const res = await request(app).get(`/api/novels/author/${alice._id}`).set(bearer(alice));
    expect(res.status).toBe(200);
    expect(res.body[0].comments).toHaveLength(1);
    expect(res.body[0].coverPhoto).toMatch(/^api\/media\/novel\//);
  });

  test('works without a cover get null', async () => {
    const alice = await createUser();
    await createNovel(alice, { coverPhoto: null });
    const res = await request(app).get('/api/novels');
    expect(res.body[0].coverPhoto).toBeNull();
  });

  test('cover endpoint serves the image with caching', async () => {
    const alice = await createUser();
    const novel = await createNovel(alice);
    const res = await request(app).get(`/api/media/novel/${novel._id}/cover`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['cache-control']).toMatch(/max-age/);
    expect(Buffer.compare(res.body, Buffer.from(PNG_BASE64, 'base64'))).toBe(0);

    expect((await request(app).get('/api/media/novel/not-an-id/cover')).status).toBe(404);
  });
});

describe('recommendations', () => {
  test('scores unread works and returns cover URLs', async () => {
    const alice = await createUser();
    const bob = await createUser({ username: 'bob', email: 'bob@example.com' });
    const read = await createNovel(bob, { title: 'Read one', genre: 'fantasy' });
    const unread = await createNovel(bob, { title: 'Unread one', genre: 'fantasy' });
    await request(app).post(`/api/users/${alice._id}/history`).set(bearer(alice))
      .send({ contentId: read._id.toString(), title: read.title, type: 'novel' });

    const res = await request(app).get(`/api/recommendations/${alice._id}`).set(bearer(alice));
    expect(res.status).toBe(200);
    expect(res.body.hasHistory).toBe(true);
    expect(res.body.recommendations.map((r) => r.title)).toEqual(['Unread one']);
    const [rec] = res.body.recommendations;
    expect(rec.coverPhoto).toBe(`api/media/novel/${unread._id}/cover`);
    expect(rec.reason).toBe('Because you read bob');
  });
});

describe('reading history', () => {
  test('cover images are not stored on the user, but come back as URLs', async () => {
    const alice = await createUser();
    const novel = await createNovel(alice);

    const post = await request(app).post(`/api/users/${alice._id}/history`).set(bearer(alice))
      .send({ contentId: novel._id.toString(), title: novel.title, type: 'novel', coverPhoto: PNG_DATA_URI });
    expect(post.status).toBe(200);

    const stored = await User.findById(alice._id).lean();
    expect(stored.readingHistory[0].coverPhoto).toBeUndefined();

    const res = await request(app).get(`/api/users/${alice._id}/history`).set(bearer(alice));
    expect(res.body[0].coverPhoto).toBe(`api/media/novel/${novel._id}/cover`);
  });

  test('rejects invalid content types', async () => {
    const alice = await createUser();
    const res = await request(app).post(`/api/users/${alice._id}/history`).set(bearer(alice))
      .send({ contentId: alice._id.toString(), type: 'widget' });
    expect(res.status).toBe(400);
  });
});

describe('announcements', () => {
  test('expiresAt has a real TTL index', async () => {
    const indexes = await Announcement.collection.indexes();
    const ttl = indexes.find((i) => i.key.expiresAt === 1);
    expect(ttl).toBeDefined();
    expect(ttl.expireAfterSeconds).toBe(0);
  });
});

describe('admin routes moved out of server.js', () => {
  test('still require an admin', async () => {
    const alice = await createUser();
    expect((await request(app).get('/api/admin/stats')).status).toBe(401);
    expect((await request(app).get('/api/admin/stats').set(bearer(alice))).status).toBe(403);
  });

  test('work for admins', async () => {
    const admin = await createUser({ isAdmin: true });
    const res = await request(app).get('/api/admin/stats').set(bearer(admin));
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBe(1);
  });

  test('approve-writer validates the action', async () => {
    const admin = await createUser({ isAdmin: true });
    const res = await request(app).post(`/api/admin/approve-writer/${admin._id}`).set(bearer(admin)).send({ action: 'maybe' });
    expect(res.status).toBe(400);
  });
});

test('unknown API routes return JSON 404', async () => {
  const res = await request(app).get('/api/does-not-exist');
  expect(res.status).toBe(404);
  expect(res.body.error).toBe('NOT_FOUND');
});
