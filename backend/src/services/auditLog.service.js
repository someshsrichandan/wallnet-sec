const AuditLog = require("../models/auditLog.model");
const { redactSensitiveObject } = require("../utils/redact");

const SEVERITY_MAP = {
  ENROLL: "INFO",
  ENROLL_UPDATE: "INFO",
  INIT_AUTH: "INFO",
  CHALLENGE_LOADED: "INFO",
  VERIFY_PASS: "INFO",
  VERIFY_FAIL: "WARN",
  SESSION_LOCKED: "WARN",
  SESSION_EXPIRED: "INFO",
  HONEYPOT_DETECTED: "CRITICAL",
  CONSUME_RESULT: "INFO",
  INIT_ENROLL: "INFO",
  ENROLL_SESSION_SUBMIT: "INFO",
  DEVICE_TRUST_LOW: "WARN",
  GEO_VELOCITY_FLAG: "CRITICAL",
  BEHAVIORAL_ANOMALY: "WARN",
  WEBHOOK_SENT: "INFO",
  WEBHOOK_FAILED: "WARN",
  API_KEY_GENERATED: "INFO",
  API_KEY_ROTATED: "INFO",
  API_KEY_REVOKED: "WARN",
  AI_FRAUD_ASSESSMENT: "INFO",
  USER_SIGNUP: "INFO",
  USER_LOGIN_SUCCESS: "INFO",
  USER_LOGIN_FAILURE: "WARN",
};

const MAX_METADATA_CHARS = 16_000;

const sanitizeMetadata = (metadata) => {
  const redacted = redactSensitiveObject(metadata || {});
  const serialized = JSON.stringify(redacted);

  if (serialized.length <= MAX_METADATA_CHARS) {
    return redacted;
  }

  return {
    truncated: true,
    maxChars: MAX_METADATA_CHARS,
    preview: serialized.slice(0, MAX_METADATA_CHARS),
  };
};

const applyOwnerFilter = (filter, ownerUserId, userId, partnerIds = []) => {
  if (ownerUserId) {
    const scopedPartners = Array.isArray(partnerIds)
      ? partnerIds.filter((item) => typeof item === "string" && item.trim())
      : [];
    const ownerScope = [{ ownerUserId }, { userId: ownerUserId }];
    if (scopedPartners.length) {
      ownerScope.push({ partnerId: { $in: scopedPartners } });
    }
    filter.$or = ownerScope;
    return;
  }

  if (userId) {
    filter.userId = userId;
  }
};

/**
 * Log a security-relevant event to the audit trail.
 */
const logEvent = async ({
  action,
  partnerId,
  ownerUserId,
  userId,
  sessionToken,
  req,
  metadata,
  geo,
} = {}) => {
  try {
    const severity = SEVERITY_MAP[action] || "INFO";
    const ip = req?.ip || req?.headers?.["x-forwarded-for"] || "";
    const userAgent =
      req?.headers?.["user-agent"] || req?.get?.("user-agent") || "";
    const requestId = req?.requestId || req?.headers?.["x-request-id"] || "";
    const safeMetadata = sanitizeMetadata(metadata || {});
    const fingerprint = safeMetadata?.fingerprint || "";
    const resolvedOwnerUserId =
      ownerUserId ||
      req?.auth?.sub ||
      req?.partnerKeyOwnerId ||
      safeMetadata?.ownerUserId ||
      "";

    await AuditLog.create({
      action,
      severity,
      partnerId: partnerId || "",
      ownerUserId: resolvedOwnerUserId,
      userId: userId || "",
      sessionToken: sessionToken || "",
      ip: typeof ip === "string" ? ip : String(ip || ""),
      userAgent: typeof userAgent === "string" ? userAgent.slice(0, 500) : "",
      requestId,
      fingerprint,
      geo: geo || {},
      metadata: safeMetadata,
    });
  } catch (error) {
    // Audit logging must never crash the main request
    // eslint-disable-next-line no-console
    console.error("[audit-log] Failed to write audit event:", error.message);
  }
};

/**
 * Query audit logs with filtering & pagination.
 */
const queryLogs = async ({
  partnerId,
  partnerIds,
  ownerUserId,
  userId,
  action,
  severity,
  limit = 50,
  offset = 0,
} = {}) => {
  const filter = {};
  if (partnerId) filter.partnerId = partnerId;
  applyOwnerFilter(filter, ownerUserId, userId, partnerIds);
  if (action) filter.action = action;
  if (severity) filter.severity = severity;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { logs, total, limit, offset };
};

/**
 * Get aggregated stats for the dashboard.
 */
const getStats = async ({ partnerId, partnerIds, ownerUserId, userId, since } = {}) => {
  const match = {};
  if (partnerId) match.partnerId = partnerId;
  applyOwnerFilter(match, ownerUserId, userId, partnerIds);
  if (since) match.createdAt = { $gte: new Date(since) };

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: "$action",
        count: { $sum: 1 },
        lastOccurrence: { $max: "$createdAt" },
      },
    },
    { $sort: { count: -1 } },
  ];

  return AuditLog.aggregate(pipeline);
};

/**
 * Get recent critical/warning events for live threat feed.
 */
const getRecentThreats = async ({ limit = 20, since, partnerIds, ownerUserId, userId } = {}) => {
  const filter = { severity: { $in: ["WARN", "CRITICAL"] } };
  applyOwnerFilter(filter, ownerUserId, userId, partnerIds);
  if (since) filter.createdAt = { $gte: new Date(since) };

  return AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
};

/**
 * Get hourly event counts for the last N hours (for dashboard sparklines).
 */
const getTimeline = async ({ hours = 24, partnerId, partnerIds, ownerUserId, userId } = {}) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const match = { createdAt: { $gte: since } };
  if (partnerId) match.partnerId = partnerId;
  applyOwnerFilter(match, ownerUserId, userId, partnerIds);

  return AuditLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          hour: {
            $dateToString: { format: "%Y-%m-%dT%H:00:00Z", date: "$createdAt" },
          },
          action: "$action",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.hour": 1 } },
  ]);
};

module.exports = {
  logEvent,
  queryLogs,
  getStats,
  getRecentThreats,
  getTimeline,
};
