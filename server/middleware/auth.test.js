process.env.JWT_SECRET = 'test-only-secret';

jest.mock('../models/User', () => ({
  findById: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth, admin } = require('./auth');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  User.findById.mockReset();
});

describe('auth middleware', () => {
  test('rejects requests with no token', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects an invalid/forged token', async () => {
    const req = { headers: { authorization: 'Bearer not-a-real-token' } };
    const res = mockRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts a valid token for an active user', async () => {
    const token = jwt.sign({ id: 'user123' }, process.env.JWT_SECRET);
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'user123', status: 'active', isAdmin: false }),
    });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.status).toBe('active');
  });

  test('blocks a valid token belonging to a suspended user', async () => {
    const token = jwt.sign({ id: 'user123' }, process.env.JWT_SECRET);
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'user123', status: 'suspended', isAdmin: false }),
    });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('admin middleware', () => {
  test('allows admins through', () => {
    const req = { user: { isAdmin: true } };
    const res = mockRes();
    const next = jest.fn();

    admin(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('blocks non-admins', () => {
    const req = { user: { isAdmin: false } };
    const res = mockRes();
    const next = jest.fn();

    admin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
