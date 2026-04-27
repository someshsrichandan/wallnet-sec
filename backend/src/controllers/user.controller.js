const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');
const HttpError = require('../utils/httpError');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/token');
const emailService = require('../services/email.service');
const {
  hashEmailForLookup,
  normalizeEmail,
} = require('../utils/fieldEncryption');
const {
  assertEmail,
  assertRequiredString,
  parsePagination,
} = require('../utils/validators');
const { logEvent } = require('../services/auditLog.service');

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
  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashEmailForLookup(normalizedEmail);
  const password = assertRequiredString('password', req.body.password, { min: 8, max: 128 });
  const existing = await User.findOne({
    $or: [{ emailHash }, { email: normalizedEmail }],
  });
  if (existing) {
    throw new HttpError(409, 'User with this email already exists');
  }

  const AdminSettings = require("../models/adminSettings.model");
  const settings = await AdminSettings.getSettings();

  const trialExpiresAt = new Date();
  if (settings.trialEnabled) {
    trialExpiresAt.setDate(trialExpiresAt.getDate() + (settings.trialDurationDays || 10));
  } else {
    // If trial is disabled, give them a day to setup and immediately ask for payment, or set as active if auto-activate is on
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 1);
  }

  const status = settings.autoActivateOnSignup ? "active" : "trial";
  const approvedAt = settings.autoActivateOnSignup ? new Date() : null;
  const apiLimit = settings.defaultApiLimit || 10000;

  const passwordHash = await hashPassword(password);
  const user = await User.create({ 
    name, 
    email: normalizedEmail, 
    passwordHash,
    status,
    trialExpiresAt,
    approvedAt,
    apiLimit
  });

  logEvent({
    action: 'USER_SIGNUP',
    ownerUserId: user.id,
    userId: user.id,
    req,
    metadata: { emailHash, status, autoActivated: settings.autoActivateOnSignup },
  });

  // Send welcome email (non-blocking)
  emailService.sendWelcomeEmail({
    email: normalizedEmail,
    name: name,
    status: status
  }).catch(err => console.error("Welcome email failed:", err));

  res.status(201).json({ id: user.id, name: user.name, email: user.email, status: user.status });
});

const login = asyncHandler(async (req, res) => {
  const email = assertEmail(req.body.email);
  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashEmailForLookup(normalizedEmail);
  const password = assertRequiredString('password', req.body.password, { min: 8, max: 128 });

  const user =
    (await User.findOne({ emailHash })) ||
    (await User.findOne({ email: normalizedEmail }));
  if (!user) {
    logEvent({
      action: 'USER_LOGIN_FAILURE',
      req,
      metadata: { emailHash, reason: 'USER_NOT_FOUND' },
    });
    throw new HttpError(401, 'Invalid email or password');
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    logEvent({
      action: 'USER_LOGIN_FAILURE',
      ownerUserId: user.id,
      userId: user.id,
      req,
      metadata: { emailHash, reason: 'INVALID_PASSWORD' },
    });
    throw new HttpError(401, 'Invalid email or password');
  }

  if (user.status === 'inactive') {
    throw new HttpError(403, user.deactivatedReason || 'Your account has been deactivated. Contact support.');
  }

  if (user.status === 'suspended') {
    throw new HttpError(403, user.deactivatedReason || 'Your account is suspended.');
  }

  if (user.status === 'trial' && user.trialExpiresAt && new Date(user.trialExpiresAt) <= new Date()) {
    throw new HttpError(403, 'Your trial period has expired. Please upgrade your account to continue.');
  }

  const token = signToken(
    { sub: user.id, email: user.email, role: user.role || 'user' },
    { secret: env.tokenSecret, expiresInSec: 60 * 60 * 12 }
  );

  logEvent({
    action: 'USER_LOGIN_SUCCESS',
    ownerUserId: user.id,
    userId: user.id,
    req,
    metadata: { emailHash },
  });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

const me = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  const user = await User.findById(userId).select('_id name email status role trialStartDate trialExpiresAt createdAt apiLimit apiUsage');

  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  res.json({
    ...user.toObject(),
    isTrialExpired: user.status === 'trial' && user.trialExpiresAt && new Date(user.trialExpiresAt) <= new Date()
  });
});

module.exports = { list, create, login, me };
