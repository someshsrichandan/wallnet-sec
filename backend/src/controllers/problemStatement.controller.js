const ProblemStatement = require('../models/problemStatement.model');
const asyncHandler = require('../utils/asyncHandler');
const {
  assertRequiredString,
  assertStringArray,
} = require('../utils/validators');

const defaultProblemStatement = {
  title: 'Fraud prevention for internet banking: anti-phishing & anti-RAT',
  shortDescription:
    'Design a phishing-proof, RAT-resistant login step that protects customers from fake portals and device takeovers while staying fast and familiar.',
  problem: {
    phishingSteps: [
      'A phishing hacker creates a fake banking website that looks trustworthy.',
      'Victims receive the phishing link via SMS, email, or WhatsApp (KYC update, refund, or blocked account).',
      'Victims enter login details, OTP, or card info on the fake site.',
      'The phishing site forwards those credentials to the attacker.',
      'The attacker uses the stolen information to access accounts and steal money or data.',
    ],
    ratSteps: [
      'Victims install a malicious APK that grants remote access to their device.',
      'The RAT monitors touches, injects inputs, and controls the device.',
      'Attackers use captured credentials to transfer funds and commit fraud.',
    ],
  },
  goals: [
    'Build a visual password that resists phishing links and RAT-controlled devices.',
    'Redirect users from partner websites to a SaaS portal for visual authentication.',
    'Return PASS/FAIL to the partner site before the traditional password step.',
  ],
};

const formatProblemStatement = (source = {}) => ({
  title: source.title || '',
  shortDescription: source.shortDescription || '',
  problem: {
    phishingSteps: Array.isArray(source?.problem?.phishingSteps)
      ? source.problem.phishingSteps
      : [],
    ratSteps: Array.isArray(source?.problem?.ratSteps) ? source.problem.ratSteps : [],
  },
  goals: Array.isArray(source.goals) ? source.goals : [],
});

const getCurrent = asyncHandler(async (req, res) => {
  const latest = await ProblemStatement.findOne().sort({ createdAt: -1 }).lean();
  res.json(formatProblemStatement(latest || defaultProblemStatement));
});

const createOrUpdate = asyncHandler(async (req, res) => {
  const payload = {
    title: assertRequiredString('title', req.body.title, { min: 10, max: 200 }),
    shortDescription: assertRequiredString('shortDescription', req.body.shortDescription, {
      min: 20,
      max: 500,
    }),
    problem: {
      phishingSteps: assertStringArray('problem.phishingSteps', req.body?.problem?.phishingSteps, {
        minItems: 1,
        maxItems: 10,
        itemMax: 300,
      }),
      ratSteps: assertStringArray('problem.ratSteps', req.body?.problem?.ratSteps, {
        minItems: 1,
        maxItems: 10,
        itemMax: 300,
      }),
    },
    goals: assertStringArray('goals', req.body.goals, {
      minItems: 1,
      maxItems: 10,
      itemMax: 300,
    }),
  };

  const latest = await ProblemStatement.findOne().sort({ createdAt: -1 });
  if (!latest) {
    const created = await ProblemStatement.create(payload);
    return res.status(201).json(formatProblemStatement(created.toObject()));
  }

  Object.assign(latest, payload);
  await latest.save();
  return res.json(formatProblemStatement(latest.toObject()));
});

module.exports = { getCurrent, createOrUpdate };
