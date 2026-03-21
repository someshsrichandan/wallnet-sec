const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const HttpError = require('../utils/httpError');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/token');
const {
  assertEmail,
  assertRequiredString,
  parsePagination,
} = require('../utils/validators');

const list = asyncHandler(async (req, res) => {
  const { limit, page, skip } = parsePagination(req.query, {
    defaultLimit: 20,
    maxLimit: 100,
  });

  const [items, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).select('_id name email createdAt'),
    User.countDocuments(),
  ]);

  res.json({
    items,
    page,
    limit,
    total,
    hasNextPage: skip + items.length < total,
  });
});

const create = asyncHandler(async (req, res) => {
  const name = assertRequiredString('name', req.body.name, { min: 2, max: 100 });
  const email = assertEmail(req.body.email);
  const password = assertRequiredString('password', req.body.password, { min: 8, max: 128 });
  const existing = await User.findOne({ email });
  if (existing) {
    throw new HttpError(409, 'User with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email, passwordHash });
  res.status(201).json({ id: user.id, name: user.name, email: user.email });
});

const login = asyncHandler(async (req, res) => {
  const email = assertEmail(req.body.email);
  const password = assertRequiredString('password', req.body.password, { min: 8, max: 128 });

  const user = await User.findOne({ email });
  if (!user) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const token = signToken(
    { sub: user.id, email: user.email, role: 'user' },
    { secret: env.tokenSecret, expiresInSec: 60 * 60 * 12 }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

const me = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  const user = await User.findById(userId).select('_id name email createdAt');

  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  res.json(user);
});

module.exports = { list, create, login, me };
