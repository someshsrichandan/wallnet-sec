const VisualSession = require("../models/visualSession.model");
const VisualCredential = require("../models/visualCredential.model");
const PartnerKey = require("../models/partnerKey.model");
const mongoose = require("mongoose");
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

const getOwnedPartnerIds = async (ownerUserId) => {
  if (!ownerUserId) {
    return [];
  }

  return PartnerKey.distinct("partnerId", { ownerUserId, active: true });
};

const buildOwnerPartnerScope = (ownerUserId, partnerIds = []) => {
  const scopedPartners =
    Array.isArray(partnerIds) ?
      partnerIds.filter((item) => typeof item === "string" && item.trim())
    : [];

  if (!ownerUserId && scopedPartners.length === 0) {
    return {};
  }

  if (!ownerUserId) {
    return { partnerId: { $in: scopedPartners } };
  }

  if (!scopedPartners.length) {
    return { ownerUserId };
  }

  return {
    $or: [{ ownerUserId }, { partnerId: { $in: scopedPartners } }],
  };
};

// ─── Dashboard Stats ───────────────────────────────────────────────────────

const getDashboardStats = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const ownedPartnerIds = await getOwnedPartnerIds(ownerUserId);
  const ownerPartnerScope = buildOwnerPartnerScope(
    ownerUserId,
    ownedPartnerIds,
  );
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
    VisualSession.countDocuments(ownerPartnerScope),
    VisualSession.countDocuments({
      ...ownerPartnerScope,
      status: "PENDING",
      expiresAt: { $gt: now },
    }),
    VisualSession.countDocuments({
      ...ownerPartnerScope,
      status: "PASS",
      verifiedAt: { $gte: last24h },
    }),
    VisualSession.countDocuments({
      ...ownerPartnerScope,
      status: "FAIL",
      lastAttemptAt: { $gte: last24h },
    }),
    VisualSession.countDocuments({
      ...ownerPartnerScope,
      status: "LOCKED",
      updatedAt: { $gte: last24h },
    }),
    VisualCredential.countDocuments({
      ...ownerPartnerScope,
      active: true,
    }),
    VisualSession.countDocuments({
      ...ownerPartnerScope,
      honeypotDetected: true,
    }),
    VisualSession.aggregate([
      { $match: ownerPartnerScope },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    VisualSession.aggregate([
      {
        $match: {
          ...ownerPartnerScope,
          status: "PASS",
          verifiedAt: { $ne: null },
        },
      },
      {
        $project: {
          verifyDurationMs: { $subtract: ["$verifiedAt", "$createdAt"] },
        },
      },
      { $group: { _id: null, avgMs: { $avg: "$verifyDurationMs" } } },
    ]),
    getStats({
      ownerUserId,
      partnerIds: ownedPartnerIds,
      since: last7d,
    }),
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
  const partnerIds = await getOwnedPartnerIds(ownerUserId);
  const limit =
    req.query.limit ?
      assertInteger("limit", req.query.limit, { min: 1, max: 100 })
    : 30;
  const since = req.query.since || undefined;

  const threats = await getRecentThreats({
    ownerUserId,
    partnerIds,
    limit,
    since,
  });

  res.json({
    threats,
    count: threats.length,
    fetchedAt: new Date().toISOString(),
  });
});

// ─── Timeline Data ──────────────────────────────────────────────────────────

const getTimelineData = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const partnerIds = await getOwnedPartnerIds(ownerUserId);
  const hours =
    req.query.hours ?
      assertInteger("hours", req.query.hours, { min: 1, max: 168 })
    : 24;
  const partnerId = req.query.partnerId || undefined;

  const timeline = await getTimeline({
    hours,
    partnerId,
    ownerUserId,
    partnerIds,
  });

  res.json({
    timeline,
    hours,
    fetchedAt: new Date().toISOString(),
  });
});

// ─── Audit Logs ─────────────────────────────────────────────────────────────

const getAuditLogs = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const partnerIds = await getOwnedPartnerIds(ownerUserId);
  const { limit, skip } = parsePagination(req.query, {
    defaultLimit: 50,
    maxLimit: 200,
  });
  const partnerId = req.query.partnerId || undefined;
  const action = req.query.action || undefined;
  const severity = req.query.severity || undefined;

  const result = await queryLogs({
    partnerId,
    ownerUserId,
    partnerIds,
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
  const ownedPartnerIds = await getOwnedPartnerIds(ownerUserId);
  const ownerPartnerScope = buildOwnerPartnerScope(
    ownerUserId,
    ownedPartnerIds,
  );
  const days =
    req.query.days ?
      assertInteger("days", req.query.days, { min: 1, max: 90 })
    : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [byFormulaMode, byCatalogType, byDay, topPartners] = await Promise.all([
    VisualSession.aggregate([
      { $match: { ...ownerPartnerScope, createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$formulaMode",
          count: { $sum: 1 },
          passed: { $sum: { $cond: [{ $eq: ["$status", "PASS"] }, 1, 0] } },
        },
      },
    ]),
    VisualSession.aggregate([
      { $match: { ...ownerPartnerScope, createdAt: { $gte: since } } },
      { $group: { _id: "$catalogType", count: { $sum: 1 } } },
    ]),
    VisualSession.aggregate([
      { $match: { ...ownerPartnerScope, createdAt: { $gte: since } } },
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
      { $match: { ...ownerPartnerScope, createdAt: { $gte: since } } },
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

// ─── Tracked Users ─────────────────────────────────────────────────────────

const getTrackedUsers = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const ownedPartnerIds = await getOwnedPartnerIds(ownerUserId);
  const ownerPartnerScope = buildOwnerPartnerScope(
    ownerUserId,
    ownedPartnerIds,
  );

  const days =
    req.query.days ?
      assertInteger("days", req.query.days, { min: 1, max: 365 })
    : 30;
  const partnerIdFilter =
    assertOptionalString("partnerId", req.query.partnerId, {
      min: 2,
      max: 80,
    }) || "";

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sessionMatch = {
    ...ownerPartnerScope,
    createdAt: { $gte: since },
  };
  const credentialMatch = {
    ...ownerPartnerScope,
    active: true,
  };

  if (partnerIdFilter) {
    const normalizedPartnerId = partnerIdFilter.trim().toLowerCase();
    sessionMatch.partnerId = normalizedPartnerId;
    credentialMatch.partnerId = normalizedPartnerId;
  }

  const [rows, credentialRows] = await Promise.all([
    VisualSession.aggregate([
      { $match: sessionMatch },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: {
            partnerId: "$partnerId",
            userId: "$userId",
          },
          totalSessions: { $sum: 1 },
          passCount: { $sum: { $cond: [{ $eq: ["$status", "PASS"] }, 1, 0] } },
          failCount: { $sum: { $cond: [{ $eq: ["$status", "FAIL"] }, 1, 0] } },
          lockedCount: {
            $sum: { $cond: [{ $eq: ["$status", "LOCKED"] }, 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] },
          },
          firstSeenAt: { $first: "$createdAt" },
          lastSeenAt: { $last: "$createdAt" },
          lastStatus: { $last: "$status" },
          lastSessionToken: { $last: "$sessionToken" },
          lastVerifiedAt: { $max: "$verifiedAt" },
          lastConsumedAt: { $max: "$consumedAt" },
          authMethods: { $addToSet: "$authMethod" },
          sourceHosts: { $addToSet: "$sourceHost" },
        },
      },
      { $sort: { lastSeenAt: -1 } },
      { $limit: 2000 },
    ]),
    VisualCredential.find(
      credentialMatch,
      {
        partnerId: 1,
        userId: 1,
        createdAt: 1,
        updatedAt: 1,
      },
      { lean: true },
    ),
  ]);

  const byPartnerUserKey = new Map();
  const buildKey = (partnerId, userId) =>
    `${String(partnerId || "")
      .trim()
      .toLowerCase()}:${String(userId || "")
      .trim()
      .toLowerCase()}`;

  for (const row of rows) {
    const partnerId = String(row?._id?.partnerId || "");
    const userId = String(row?._id?.userId || "");
    if (!partnerId || !userId) {
      continue;
    }

    byPartnerUserKey.set(buildKey(partnerId, userId), {
      partnerId,
      userId,
      totalSessions: Number(row.totalSessions || 0),
      passCount: Number(row.passCount || 0),
      failCount: Number(row.failCount || 0),
      lockedCount: Number(row.lockedCount || 0),
      pendingCount: Number(row.pendingCount || 0),
      firstSeenAt: row.firstSeenAt || null,
      lastSeenAt: row.lastSeenAt || null,
      lastStatus: String(row.lastStatus || "PENDING"),
      lastSessionToken: String(row.lastSessionToken || ""),
      lastVerifiedAt: row.lastVerifiedAt || null,
      lastConsumedAt: row.lastConsumedAt || null,
      authMethods: Array.isArray(row.authMethods) ? row.authMethods : [],
      sourceHosts: Array.isArray(row.sourceHosts) ? row.sourceHosts : [],
      credentialCreatedAt: null,
      credentialUpdatedAt: null,
    });
  }

  for (const credential of credentialRows) {
    const partnerId = String(credential?.partnerId || "")
      .trim()
      .toLowerCase();
    const userId = String(credential?.userId || "")
      .trim()
      .toLowerCase();
    if (!partnerId || !userId) {
      continue;
    }

    const key = buildKey(partnerId, userId);
    const existing = byPartnerUserKey.get(key);
    if (!existing) {
      byPartnerUserKey.set(key, {
        partnerId,
        userId,
        totalSessions: 0,
        passCount: 0,
        failCount: 0,
        lockedCount: 0,
        pendingCount: 0,
        firstSeenAt: null,
        lastSeenAt: null,
        lastStatus: "PENDING",
        lastSessionToken: "",
        lastVerifiedAt: null,
        lastConsumedAt: null,
        authMethods: [],
        sourceHosts: [],
        credentialCreatedAt: credential?.createdAt || null,
        credentialUpdatedAt: credential?.updatedAt || null,
      });
      continue;
    }

    existing.credentialCreatedAt =
      credential?.createdAt || existing.credentialCreatedAt;
    existing.credentialUpdatedAt =
      credential?.updatedAt || existing.credentialUpdatedAt;
  }

  const allRows = [...byPartnerUserKey.values()];

  const userIds = [
    ...new Set(
      allRows
        .map((row) =>
          String(row?.userId || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  ];

  const findProfiles = async (dbName, collectionName) => {
    const dbConn =
      dbName ?
        mongoose.connection.useDb(dbName, { useCache: true })
      : mongoose.connection;

    try {
      return await dbConn
        .collection(collectionName)
        .find(
          { partnerUserId: { $in: userIds } },
          {
            projection: {
              partnerId: 1,
              partnerUserId: 1,
              fullName: 1,
              email: 1,
              phone: 1,
            },
          },
        )
        .toArray();
    } catch {
      return [];
    }
  };

  const profileDocs =
    userIds.length ?
      (
        await Promise.all([
          findProfiles(null, "users"),
          findProfiles(null, "wallet_users"),
          findProfiles("demo-bank", "users"),
          findProfiles("demo-shop", "users"),
          findProfiles("demo-wallet", "wallet_users"),
        ])
      ).flat()
    : [];

  const profileByPartnerAndUser = new Map();
  const profileByUserOnly = new Map();

  for (const doc of profileDocs) {
    const pid = String(doc?.partnerId || "")
      .trim()
      .toLowerCase();
    const uid = String(doc?.partnerUserId || "")
      .trim()
      .toLowerCase();
    if (!uid) continue;
    if (pid && !profileByPartnerAndUser.has(`${pid}:${uid}`)) {
      profileByPartnerAndUser.set(`${pid}:${uid}`, doc);
    }
    if (!profileByUserOnly.has(uid)) {
      profileByUserOnly.set(uid, doc);
    }
  }

  const users = allRows
    .map((row) => {
      const partnerId = String(row?.partnerId || "")
        .trim()
        .toLowerCase();
      const userId = String(row?.userId || "")
        .trim()
        .toLowerCase();
      const profileKey = `${partnerId}:${userId}`;
      const profile =
        profileByPartnerAndUser.get(profileKey) ||
        profileByUserOnly.get(userId) ||
        null;

      const totalSessions = Number(row.totalSessions || 0);
      const passCount = Number(row.passCount || 0);
      const firstSeenAt = row.firstSeenAt || row.credentialCreatedAt || null;
      const lastSeenAt =
        row.lastSeenAt ||
        row.lastVerifiedAt ||
        row.credentialUpdatedAt ||
        row.credentialCreatedAt ||
        null;
      const sourceHost =
        row.sourceHosts
          .map((item) => String(item || "").trim())
          .filter(Boolean)
          .join(", ") || "";
      const authMethod =
        row.authMethods
          .map((item) => String(item || "").trim())
          .filter(Boolean)
          .join(", ") || "unknown";

      return {
        id: `${partnerId}:${userId}`,
        partnerId,
        userId,
        fullName: String(profile?.fullName || "Unknown User"),
        email: String(profile?.email || ""),
        phone: String(profile?.phone || ""),
        sourceHost,
        authMethod,
        totalSessions,
        passCount,
        failCount: Number(row.failCount || 0),
        lockedCount: Number(row.lockedCount || 0),
        pendingCount: Number(row.pendingCount || 0),
        passRate:
          totalSessions > 0 ? Math.round((passCount / totalSessions) * 100) : 0,
        lastStatus: String(row.lastStatus || "PENDING"),
        lastSessionToken: String(row.lastSessionToken || ""),
        firstSeenAt,
        lastSeenAt,
        lastVerifiedAt: row.lastVerifiedAt || null,
        lastConsumedAt: row.lastConsumedAt || null,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 1000);

  res.json({
    days,
    total: users.length,
    users,
  });
});

module.exports = {
  getDashboardStats,
  getThreatFeed,
  getTimelineData,
  getAuditLogs,
  getSessionAnalytics,
  getTrackedUsers,
};
