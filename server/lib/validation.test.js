const {
  escapeRegex,
  pick,
  isValidStatus,
  isValidContentType,
  validateUsername,
  isValidEmail,
  validatePassword,
  NOVEL_EDITABLE_FIELDS,
} = require('./validation');

describe('escapeRegex', () => {
  test('makes regex metacharacters literal', () => {
    const escaped = escapeRegex('(a+)+$.*');
    expect(new RegExp(escaped).test('(a+)+$.*')).toBe(true);
    expect(new RegExp(`^${escaped}$`).test('aaaa')).toBe(false);
  });

  test('leaves ordinary text unchanged', () => {
    expect(escapeRegex('alice_99')).toBe('alice_99');
  });
});

describe('pick', () => {
  test('keeps only allowed keys', () => {
    const body = { title: 'New', authorId: 'x', views: 999, likes: ['a'], comments: [] };
    expect(pick(body, NOVEL_EDITABLE_FIELDS)).toEqual({ title: 'New' });
  });

  test('ignores missing and undefined keys and non-objects', () => {
    expect(pick({ title: undefined }, ['title'])).toEqual({});
    expect(pick(null, ['title'])).toEqual({});
  });
});

describe('validators', () => {
  test('status', () => {
    expect(isValidStatus('draft')).toBe(true);
    expect(isValidStatus('published')).toBe(true);
    expect(isValidStatus('deleted')).toBe(false);
    expect(isValidStatus(undefined)).toBe(false);
  });

  test('content type', () => {
    expect(isValidContentType('novel')).toBe(true);
    expect(isValidContentType('article')).toBe(true);
    expect(isValidContentType('users')).toBe(false);
  });

  test('username', () => {
    expect(validateUsername('alice_99')).toBeNull();
    expect(validateUsername('කසුනි')).toBeNull(); // non-Latin letters are allowed
    expect(validateUsername('ab')).toMatch(/3–30/);
    expect(validateUsername('has space')).toMatch(/3–30/);
    expect(validateUsername('a/b/c')).toMatch(/3–30/);
    expect(validateUsername('')).toBe('Username is required.');
    expect(validateUsername({ $ne: null })).toBe('Username is required.');
  });

  test('email', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail({ $ne: null })).toBe(false);
  });

  test('password', () => {
    expect(validatePassword('123456')).toBeNull();
    expect(validatePassword('123')).toMatch(/at least 6/);
    expect(validatePassword(undefined)).toMatch(/at least 6/);
  });
});
