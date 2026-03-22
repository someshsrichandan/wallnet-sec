const VisualSession = require("../models/visualSession.model");
const VisualCredential = require("../models/visualCredential.model");
const VisualEnrollSession = require("../models/visualEnrollSession.model");
const EmailSettings = require("../models/emailSettings.model");
const PartnerKey = require("../models/partnerKey.model");
const AuditLog = require("../models/auditLog.model");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const {
  assertEmail,
  assertRequiredString,
  assertOptionalHttpUrl,
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

const FIVE_MINUTES_MS = 5 * 60 * 1000;

const maskEmailAddress = (email) => {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  const [localRaw, domainRaw] = normalized.split("@");
  if (!localRaw || !domainRaw) {
    return "";
  }

  const local =
    localRaw.length <= 2 ?
      `${localRaw.slice(0, 1)}*`
    : `${localRaw.slice(0, 2)}***`;
  return `${local}@${domainRaw}`;
};

const buildResetEmailHtml = ({ fullName, resetUrl, expiresInMinutes }) => {
  const safeName = String(fullName || "there").trim() || "there";
  const safeUrl = String(resetUrl || "").trim();

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:640px;margin:0 auto;padding:20px;">
      <h2 style="margin:0 0 12px;">Visual Password Reset</h2>
      <p>Hi ${safeName},</p>
      <p>Your admin has requested a visual password reset for your account.</p>
      <p>
        <a href="${safeUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
          Reset Visual Password
        </a>
      </p>
      <p>This link is valid for <strong>${expiresInMinutes} minutes</strong> from the time this email was sent.</p>
      <p>If the button does not work, copy and paste this URL into your browser:</p>
      <p style="word-break:break-all;color:#334155;">${safeUrl}</p>
      <p style="margin-top:20px;color:#475569;">If you did not request this, please contact support.</p>
    </div>
  `;
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
    // Session docs have short TTL for security, so use audit trails for historical totals.
    AuditLog.countDocuments({
      ...ownerPartnerScope,
      action: "INIT_AUTH",
    }),
    VisualSession.countDocuments({
      ...ownerPartnerScope,
      status: "PENDING",
      expiresAt: { $gt: now },
    }),
    AuditLog.countDocuments({
      ...ownerPartnerScope,
      action: "VERIFY_PASS",
      createdAt: { $gte: last24h },
    }),
    AuditLog.countDocuments({
      ...ownerPartnerScope,
      action: "VERIFY_FAIL",
      createdAt: { $gte: last24h },
    }),
    AuditLog.countDocuments({
      ...ownerPartnerScope,
      action: "SESSION_LOCKED",
      createdAt: { $gte: last24h },
    }),
    VisualCredential.countDocuments({
      ...ownerPartnerScope,
      active: true,
    }),
    AuditLog.countDocuments({
      ...ownerPartnerScope,
      action: "HONEYPOT_DETECTED",
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

  // Add historical terminal outcomes from audit logs so the 24h chart is not blank
  // when TTL cleanup removes old session documents.
  statusMap.PASS = Math.max(Number(statusMap.PASS || 0), passedSessions24h);
  statusMap.FAIL = Math.max(Number(statusMap.FAIL || 0), failedSessions24h);
  statusMap.LOCKED = Math.max(Number(statusMap.LOCKED || 0), lockedSessions24h);
  statusMap.PENDING = Math.max(Number(statusMap.PENDING || 0), activeSessions);

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
  const actions =
    typeof req.query.actions === "string" ?
      req.query.actions
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : undefined;
  const severity = req.query.severity || undefined;
  const sinceHours =
    req.query.sinceHours ?
      assertInteger("sinceHours", req.query.sinceHours, { min: 1, max: 720 })
    : undefined;
  const since =
    sinceHours ? new Date(Date.now() - sinceHours * 60 * 60 * 1000) : undefined;

  const result = await queryLogs({
    partnerId,
    ownerUserId,
    partnerIds,
    action,
    actions,
    severity,
    since,
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

const sendTrackedUserVisualResetEmail = asyncHandler(async (req, res) => {
  const ownerUserId = assertRequiredString("auth.sub", req.auth?.sub, {
    min: 8,
    max: 120,
  });

  const partnerId = String(
    assertRequiredString("partnerId", req.body.partnerId, { min: 3, max: 80 }),
  )
    .trim()
    .toLowerCase();
  const userId = String(
    assertRequiredString("userId", req.body.userId, { min: 3, max: 120 }),
  )
    .trim()
    .toLowerCase();
  const email = assertEmail(req.body.email);
  const fullName =
    assertOptionalString("fullName", req.body.fullName, { max: 120 }) ||
    "there";
  const appBaseUrlRaw = assertOptionalHttpUrl(
    "appBaseUrl",
    req.body.appBaseUrl,
  );

  const ownedPartnerIds = await getOwnedPartnerIds(ownerUserId);
  if (!ownedPartnerIds.includes(partnerId)) {
    throw new HttpError(
      403,
      "You can only reset users for your own partner apps",
    );
  }

  const credential = await VisualCredential.findOne({
    partnerId,
    userId,
    active: true,
  }).lean();
  if (!credential) {
    throw new HttpError(404, "No enrolled visual profile found for this user");
  }

  const appBaseUrl = appBaseUrlRaw || "http://localhost:3001";
  const session = await VisualEnrollSession.createSession({
    partnerId,
    userId,
    callbackUrl: null,
    partnerState: null,
    ttlMs: FIVE_MINUTES_MS,
  });

  const resetUrl = `${appBaseUrl.replace(/\/$/, "")}/enroll/${encodeURIComponent(session.enrollToken)}`;
  let emailSettings = await EmailSettings.findOne({
    partnerId,
    enabled: true,
  });

  // Fallback to owner's latest enabled SMTP profile so admin reset can still work
  // when the tracked user's partner does not have dedicated settings saved yet.
  if (!emailSettings) {
    emailSettings = await EmailSettings.findOne({
      ownerUserId,
      enabled: true,
    }).sort({ updatedAt: -1 });
  }

  if (!emailSettings) {
    throw new HttpError(
      400,
      "Email settings are not configured. Save SMTP settings in Admin > Settings first.",
    );
  }

  const transporter = nodemailer.createTransport({
    host: emailSettings.emailHost,
    port: Number(emailSettings.emailPort || 587),
    secure: Number(emailSettings.emailPort || 587) === 465,
    auth: {
      user: emailSettings.emailUser,
      pass: String(emailSettings.emailPass || ""),
    },
  });

  await transporter.sendMail({
    from: `"${emailSettings.fromName || "Visual Security"}" <${emailSettings.emailUser}>`,
    to: email,
    bcc: emailSettings.emailTo || undefined,
    subject: "Reset your visual password",
    text:
      `Hi ${fullName},\n\n` +
      "Your admin requested a visual password reset.\n" +
      `Use this link within 5 minutes: ${resetUrl}\n\n` +
      "If you did not request this, please contact support.",
    html: buildResetEmailHtml({
      fullName,
      resetUrl,
      expiresInMinutes: 5,
    }),
  });

  res.status(201).json({
    ok: true,
    message: "Reset visual password email sent",
    partnerId,
    userId,
    emailMasked: maskEmailAddress(email),
    expiresAt: session.expiresAt,
  });
});

module.exports = {
  getDashboardStats,
  getThreatFeed,
  getTimelineData,
  getAuditLogs,
  getSessionAnalytics,
  getTrackedUsers,
  sendTrackedUserVisualResetEmail,
};
