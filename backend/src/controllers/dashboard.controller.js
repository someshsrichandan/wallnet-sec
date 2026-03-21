const VisualSession = require("../models/visualSession.model");
const VisualCredential = require("../models/visualCredential.model");
const asyncHandler = require("../utils/asyncHandler");
const {
  assertRequiredString,
  assertOptionalString,
  assertInteger,
  parsePagination,
} = require("../utils/validators");
const {
  getStats,
  getRecentThreats,
  getTimeline,
  queryLogs,
} = require("../services/auditLog.service");

// ─── Dashboard Stats ───────────────────────────────────────────────────────

const getDashboardStats = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalSessions,
    activeSessions,
    passedSessions24h,
    failedSessions24h,
    lockedSessions24h,
    totalCredentials,
    honeypotSessions,
    sessionsByStatus,
    avgVerificationTime,
    auditStats,
  ] = await Promise.all([
    VisualSession.countDocuments({ ownerUserId }),
    VisualSession.countDocuments({
      ownerUserId,
      status: "PENDING",
      expiresAt: { $gt: now },
    }),
    VisualSession.countDocuments({
      ownerUserId,
      status: "PASS",
      verifiedAt: { $gte: last24h },
    }),
    VisualSession.countDocuments({
      ownerUserId,
      status: "FAIL",
      lastAttemptAt: { $gte: last24h },
    }),
    VisualSession.countDocuments({
      ownerUserId,
      status: "LOCKED",
      updatedAt: { $gte: last24h },
    }),
    VisualCredential.countDocuments({ ownerUserId, active: true }),
    VisualSession.countDocuments({ ownerUserId, honeypotDetected: true }),
    VisualSession.aggregate([
      { $match: { ownerUserId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    VisualSession.aggregate([
      { $match: { ownerUserId, status: "PASS", verifiedAt: { $ne: null } } },
      {
        $project: {
          verifyDurationMs: { $subtract: ["$verifiedAt", "$createdAt"] },
        },
      },
      { $group: { _id: null, avgMs: { $avg: "$verifyDurationMs" } } },
    ]),
    getStats({ userId: ownerUserId, since: last7d }),
  ]);

  const statusMap = {};
  for (const item of sessionsByStatus) {
    statusMap[item._id] = item.count;
  }

  res.json({
    overview: {
      totalSessions,
      activeSessions,
      totalCredentials,
      honeypotDetections: honeypotSessions,
      avgVerificationTimeMs:
        avgVerificationTime[0]?.avgMs ?
          Math.round(avgVerificationTime[0].avgMs)
        : 0,
    },
    last24h: {
      passed: passedSessions24h,
      failed: failedSessions24h,
      locked: lockedSessions24h,
      total: passedSessions24h + failedSessions24h + lockedSessions24h,
      passRate:
        passedSessions24h + failedSessions24h + lockedSessions24h > 0 ?
          Math.round(
            (passedSessions24h /
              (passedSessions24h + failedSessions24h + lockedSessions24h)) *
              100,
          )
        : 0,
    },
    byStatus: statusMap,
    auditStats,
  });
});

// ─── Threat Feed ────────────────────────────────────────────────────────────

const getThreatFeed = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const limit =
    req.query.limit ?
      assertInteger("limit", req.query.limit, { min: 1, max: 100 })
    : 30;
  const since = req.query.since || undefined;

  const threats = await getRecentThreats({ userId: ownerUserId, limit, since });

  res.json({
    threats,
    count: threats.length,
    fetchedAt: new Date().toISOString(),
  });
});

// ─── Timeline Data ──────────────────────────────────────────────────────────

const getTimelineData = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const hours =
    req.query.hours ?
      assertInteger("hours", req.query.hours, { min: 1, max: 168 })
    : 24;
  const partnerId = req.query.partnerId || undefined;

  const timeline = await getTimeline({ hours, partnerId, userId: ownerUserId });

  res.json({
    timeline,
    hours,
    fetchedAt: new Date().toISOString(),
  });
});

// ─── Audit Logs ─────────────────────────────────────────────────────────────

const getAuditLogs = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const { limit, skip } = parsePagination(req.query, {
    defaultLimit: 50,
    maxLimit: 200,
  });
  const partnerId = req.query.partnerId || undefined;
  const action = req.query.action || undefined;
  const severity = req.query.severity || undefined;

  const result = await queryLogs({
    partnerId,
    userId: ownerUserId,
    action,
    severity,
    limit,
    offset: skip,
  });

  res.json(result);
});

// ─── Session Analytics ──────────────────────────────────────────────────────

const getSessionAnalytics = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const days =
    req.query.days ?
      assertInteger("days", req.query.days, { min: 1, max: 90 })
    : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [byFormulaMode, byCatalogType, byDay, topPartners] = await Promise.all([
    VisualSession.aggregate([
      { $match: { ownerUserId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$formulaMode",
          count: { $sum: 1 },
          passed: { $sum: { $cond: [{ $eq: ["$status", "PASS"] }, 1, 0] } },
        },
      },
    ]),
    VisualSession.aggregate([
      { $match: { ownerUserId, createdAt: { $gte: since } } },
      { $group: { _id: "$catalogType", count: { $sum: 1 } } },
    ]),
    VisualSession.aggregate([
      { $match: { ownerUserId, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: 1 },
          passed: { $sum: { $cond: [{ $eq: ["$status", "PASS"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "FAIL"] }, 1, 0] } },
          locked: { $sum: { $cond: [{ $eq: ["$status", "LOCKED"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    VisualSession.aggregate([
      { $match: { ownerUserId, createdAt: { $gte: since } } },
      { $group: { _id: "$partnerId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  res.json({
    days,
    byFormulaMode,
    byCatalogType,
    byDay,
    topPartners,
  });
});

module.exports = {
  getDashboardStats,
  getThreatFeed,
  getTimelineData,
  getAuditLogs,
  getSessionAnalytics,
};
