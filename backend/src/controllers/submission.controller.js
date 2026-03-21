const Submission = require('../models/submission.model');
const asyncHandler = require('../utils/asyncHandler');
const {
  assertBoolean,
  assertEmail,
  assertOptionalString,
  assertRequiredString,
  parsePagination,
} = require('../utils/validators');

const create = asyncHandler(async (req, res) => {
  const teamName = assertRequiredString('teamName', req.body.teamName, { min: 2, max: 100 });
  const email = assertEmail(req.body.email);
  const summary = assertRequiredString('summary', req.body.summary, { min: 20, max: 5000 });
  const techStack = assertOptionalString('techStack', req.body.techStack, { max: 200 });
  const timeline = assertOptionalString('timeline', req.body.timeline, { max: 120 });
  const consent = assertBoolean('consent', req.body.consent, false);

  const submission = await Submission.create({
    teamName,
    email,
    summary,
    techStack,
    timeline,
    consent: Boolean(consent),
  });

  res.status(201).json({
    id: submission.id,
    teamName: submission.teamName,
    createdAt: submission.createdAt,
  });
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, {
    defaultLimit: 20,
    maxLimit: 100,
  });

  const [items, total] = await Promise.all([
    Submission.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Submission.countDocuments(),
  ]);

  res.json({
    items,
    page,
    limit,
    total,
    hasNextPage: skip + items.length < total,
  });
});

module.exports = { create, list };
