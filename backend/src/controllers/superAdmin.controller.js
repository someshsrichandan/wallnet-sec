const crypto = require("crypto");
const User = require("../models/user.model");
const PartnerKey = require("../models/partnerKey.model");
const AdminSettings = require("../models/adminSettings.model");
const AuditLog = require("../models/auditLog.model");
const DailyUsage = require("../models/dailyUsage.model");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const env = require("../config/env");
const { signToken } = require("../utils/token");
const { verifyPassword } = require("../utils/password");
const emailService = require("../services/email.service");
const {
  hashEmailForLookup,
  normalizeEmail,
  decryptString,
} = require("../utils/fieldEncryption");
const {
  assertRequiredString,
  assertOptionalString,
  assertInteger,
  parsePagination,
} = require("../utils/validators");
const { logEvent } = require("../services/auditLog.service");

// ─── Super Admin Login ──────────────────────────────────────────────────────

const login = asyncHandler(async (req, res) => {
  const email = assertRequiredString("email", req.body.email, {
    min: 5,
    max: 200,
  });
  const password = assertRequiredString("password", req.body.password, {
    min: 6,
    max: 200,
  });

  if (!env.superAdminEmail || !env.superAdminPassword) {
    throw new HttpError(503, "Super admin credentials not configured");
  }

  // Use timingSafeEqual to prevent timing attacks on credentials
  const emailMatch = email.trim().toLowerCase() === env.superAdminEmail.trim().toLowerCase();
  
  // For password, we use buffer comparison
  const submittedPassBuf = Buffer.from(password);
  const actualPassBuf = Buffer.from(env.superAdminPassword);
  const passwordMatch = 
    submittedPassBuf.length === actualPassBuf.length && 
    crypto.timingSafeEqual(submittedPassBuf, actualPassBuf);

  if (!emailMatch || !passwordMatch) {
    await logEvent({
      action: "SUPER_ADMIN_LOGIN_FAILURE",
      req,
      metadata: { reason: "INVALID_CREDENTIALS", email },
    });
    throw new HttpError(401, "Invalid super admin credentials");
  }

  const token = signToken(
    { sub: "superadmin", email: env.superAdminEmail, role: "superadmin" },
    { secret: env.tokenSecret, expiresInSec: 30 * 60 } // 30 minutes
  );

  await logEvent({
    action: "SUPER_ADMIN_LOGIN_SUCCESS",
    req,
    metadata: { email: env.superAdminEmail },
  });

  // Security alert for super admin login
  emailService.sendAdminLoginAlert(
    env.superAdminEmail,
    req.ip,
    req.get('user-agent') || 'Unknown'
  ).catch(err => console.error("Admin login alert email failed:", err));

  res.json({
    token,
    user: {
      id: "superadmin",
      name: "Super Admin",
      email: env.superAdminEmail,
      role: "superadmin",
    },
  });
});

// ─── Dashboard Overview ─────────────────────────────────────────────────────

const getDashboardOverview = asyncHandler(async (req, res) => {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    trialUsers,
    inactiveUsers,
    suspendedUsers,
    totalApiKeys,
    activeApiKeys,
    pendingApiKeys,
    recentSignups,
    last24hAuditCount,
    settings,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: "active" }),
    User.countDocuments({ status: "trial" }),
    User.countDocuments({ status: "inactive" }),
    User.countDocuments({ status: "suspended" }),
    PartnerKey.countDocuments(),
    PartnerKey.countDocuments({ active: true, approvalStatus: "approved" }),
    PartnerKey.countDocuments({ approvalStatus: "pending" }),
    User.countDocuments({ createdAt: { $gte: last7d } }),
    AuditLog.countDocuments({ createdAt: { $gte: last24h } }),
    AdminSettings.getSettings(),
  ]);

  // Global usage history
  const range = req.query.range || "30d";
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);

  if (range === "1d") startDate.setDate(startDate.getDate() - 1);
  else if (range === "7d") startDate.setDate(startDate.getDate() - 7);
  else if (range === "1y") startDate.setFullYear(startDate.getFullYear() - 1);
  else if (range === "total") startDate.setTime(0);
  else startDate.setDate(startDate.getDate() - 30); // Default 30d

  const usageHistory = await DailyUsage.aggregate([
    { $match: { date: { $gte: startDate } } },
    { $group: { _id: "$date", count: { $sum: "$count" } } },
    { $sort: { _id: 1 } }
  ]);

  // Expired trial users
  const expiredTrialUsers = await User.countDocuments({
    status: "trial",
    trialExpiresAt: { $lte: now },
  });

  res.json({
    overview: {
      totalUsers,
      activeUsers,
      trialUsers,
      inactiveUsers,
      suspendedUsers,
      expiredTrialUsers,
      totalApiKeys,
      activeApiKeys,
      pendingApiKeys,
      recentSignups,
      last24hAuditCount,
    },
    usageHistory: usageHistory.map(h => ({ date: h._id, count: h.count })),
    settings: {
      trialDurationDays: settings.trialDurationDays,
      trialEnabled: settings.trialEnabled,
      requireApiApproval: settings.requireApiApproval,
      autoActivateOnSignup: settings.autoActivateOnSignup,
      paymentAmount: settings.paymentAmount,
      paymentCurrency: settings.paymentCurrency,
      announcementText: settings.announcementText,
      announcementEnabled: settings.announcementEnabled,
    },
    generatedAt: now.toISOString(),
  });
});

// ─── List All Partners/Users ────────────────────────────────────────────────

const listPartners = asyncHandler(async (req, res) => {
  const { limit, page, skip } = parsePagination(req.query, {
    defaultLimit: 20,
    maxLimit: 100,
  });
  const statusFilter = req.query.status || undefined;
  const search = req.query.search || undefined;

  const filter = {};
  if (statusFilter && ["active", "inactive", "trial", "suspended"].includes(statusFilter)) {
    filter.status = statusFilter;
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("_id userId name email emailHash status role trialExpiresAt approvedAt deactivatedAt deactivatedReason createdAt updatedAt apiLimit apiUsage")
      .lean(),
    User.countDocuments(filter),
  ]);

  // Enrich with API key counts
  const enriched = await Promise.all(
    items.map(async (user) => {
      const apiKeyCount = await PartnerKey.countDocuments({
        ownerUserId: user._id.toString(),
      });
      const activeApiKeyCount = await PartnerKey.countDocuments({
        ownerUserId: user._id.toString(),
        active: true,
        approvalStatus: "approved",
      });
      const pendingApiKeyCount = await PartnerKey.countDocuments({
        ownerUserId: user._id.toString(),
        approvalStatus: "pending",
      });
      const totalUsage = await PartnerKey.aggregate([
        { $match: { ownerUserId: user._id.toString() } },
        { $group: { _id: null, total: { $sum: "$usageCount" } } },
      ]);

      return {
        ...user,
        id: user._id,
        email: decryptString(user.email),
        name: decryptString(user.name),
        apiKeyCount,
        activeApiKeyCount,
        pendingApiKeyCount,
        totalApiUsage: totalUsage[0]?.total || 0,
        isTrialExpired:
          user.status === "trial" &&
          user.trialExpiresAt &&
          new Date(user.trialExpiresAt) <= new Date(),
      };
    })
  );

  res.json({
    items: enriched,
    page,
    limit,
    total,
    hasNextPage: skip + items.length < total,
  });
});

// ─── Get Single Partner Details ─────────────────────────────────────────────

const getPartnerDetail = asyncHandler(async (req, res) => {
  const userId = assertRequiredString("userId", req.params.userId, {
    min: 1,
    max: 100,
  });

  const user = await User.findById(userId)
    .select("-__v -passwordHash")
    .lean();

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  // Get all their API keys
  const apiKeys = await PartnerKey.find({ ownerUserId: userId })
    .sort({ createdAt: -1 })
    .select("-__v -keySecretHash -webhookSecret -apiKeyEncrypted")
    .lean();

  // Get recent audit logs
  const recentLogs = await AuditLog.find({
    $or: [
      { userId: userId },
      { ownerUserId: userId },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("action severity partnerId createdAt metadata")
    .lean();

  const range = req.query.range || "30d";
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);

  if (range === "1d") startDate.setDate(startDate.getDate() - 1);
  else if (range === "7d") startDate.setDate(startDate.getDate() - 7);
  else if (range === "1y") startDate.setFullYear(startDate.getFullYear() - 1);
  else if (range === "total") startDate.setTime(0);
  else startDate.setDate(startDate.getDate() - 30);

  const usageHistory = await DailyUsage.find({
    ownerUserId: userId,
    date: { $gte: startDate }
  }).sort({ date: 1 }).lean();

  const keyUsageStats = apiKeys.map(k => ({
    name: k.keyId.substring(0, 8),
    usage: k.usageCount || 0
  })).sort((a,b) => b.usage - a.usage).slice(0, 5);

  const logStats = await AuditLog.aggregate([
    { $match: { $or: [{ userId: userId.toString() }, { ownerUserId: userId.toString() }] } },
    { $group: { _id: "$severity", count: { $sum: 1 } } }
  ]);

  res.json({
    partner: {
      ...user,
      id: user._id,
      email: decryptString(user.email),
      name: decryptString(user.name),
      isTrialExpired:
        user.status === "trial" &&
        user.trialExpiresAt &&
        new Date(user.trialExpiresAt) <= new Date(),
    },
    apiKeys: apiKeys.map((key) => ({
      ...key,
      id: key._id,
      apiKey:
        key.apiKeyPreview
          ? `${"•".repeat(24)}${key.apiKeyPreview}`
          : "",
    })),
    recentLogs,
    usageHistory: usageHistory.map(h => ({ date: h.date, count: h.count })),
    keyUsageStats,
    logStats: logStats.map(s => ({ name: s._id, value: s.count })),
  });
});

// ─── Activate Partner ───────────────────────────────────────────────────────

const activatePartner = asyncHandler(async (req, res) => {
  const userId = assertRequiredString("userId", req.params.userId, {
    min: 1,
    max: 100,
  });

  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  user.status = "active";
  user.approvedAt = new Date();
  user.deactivatedAt = null;
  user.deactivatedReason = "";
  await user.save();

  // Activate all their approved API keys
  await PartnerKey.updateMany(
    { ownerUserId: userId, approvalStatus: "approved" },
    { $set: { active: true } }
  );

  await logEvent({
    action: "SUPER_ADMIN_ACTIVATE_PARTNER",
    userId: "superadmin",
    req,
    metadata: { targetUserId: userId, userName: user.name },
  });

  // Automated Email Notification
  try {
    await emailService.sendEmail({
      to: user.email,
      subject: "Your Account has been Activated - WallNet-Sec",
      text: `Hello ${user.name},\n\nYour partner account has been approved and activated. You can now login and generate API keys.\n\nBest Regards,\nWallNet-Sec Team`,
      html: `<h3>Hello ${user.name},</h3><p>Your partner account has been <strong>approved and activated</strong>.</p><p>You can now login to your dashboard and generate API keys to start using our services.</p><br/><p>Best Regards,<br/>WallNet-Sec Team</p>`
    });
  } catch (err) {
    console.error("Failed to send activation email:", err);
  }

  res.json({
    message: "Partner activated successfully",
    user: { id: user._id, name: user.name, status: user.status },
  });
});

// ─── Deactivate Partner ─────────────────────────────────────────────────────

const deactivatePartner = asyncHandler(async (req, res) => {
  const userId = assertRequiredString("userId", req.params.userId, {
    min: 1,
    max: 100,
  });
  const reason = assertOptionalString("reason", req.body.reason, { max: 500 }) || "Deactivated by admin";

  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  user.status = "inactive";
  user.deactivatedAt = new Date();
  user.deactivatedReason = reason;
  await user.save();

  // Deactivate ALL their API keys
  await PartnerKey.updateMany(
    { ownerUserId: userId },
    { $set: { active: false } }
  );

  await logEvent({
    action: "SUPER_ADMIN_DEACTIVATE_PARTNER",
    userId: "superadmin",
    req,
    metadata: { targetUserId: userId, userName: user.name, reason },
  });

  // Automated Email Notification
  try {
    await emailService.sendEmail({
      to: user.email,
      subject: "Account Notice: Deactivation - WallNet-Sec",
      text: `Hello ${user.name},\n\nYour account has been deactivated for the following reason: ${reason}\n\nPlease contact support if you believe this is an error.\n\nBest Regards,\nWallNet-Sec Team`,
      html: `<h3>Hello ${user.name},</h3><p>Your account has been <strong>deactivated</strong>.</p><p><strong>Reason:</strong> ${reason}</p><p>Please contact support if you believe this is an error.</p><br/><p>Best Regards,<br/>WallNet-Sec Team</p>`
    });
  } catch (err) {
    console.error("Failed to send deactivation email:", err);
  }

  res.json({
    message: "Partner deactivated. They cannot login and all their API keys are disabled.",
    user: { id: user._id, name: user.name, status: user.status },
  });
});

// ─── Suspend Partner ────────────────────────────────────────────────────────

const suspendPartner = asyncHandler(async (req, res) => {
  const userId = assertRequiredString("userId", req.params.userId, {
    min: 1,
    max: 100,
  });
  const reason = assertOptionalString("reason", req.body.reason, { max: 500 }) || "Suspended by admin";

  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  user.status = "suspended";
  user.deactivatedAt = new Date();
  user.deactivatedReason = reason;
  await user.save();

  await PartnerKey.updateMany(
    { ownerUserId: userId },
    { $set: { active: false } }
  );

  await logEvent({
    action: "SUPER_ADMIN_SUSPEND_PARTNER",
    userId: "superadmin",
    req,
    metadata: { targetUserId: userId, userName: user.name, reason },
  });

  // Automated Email Notification
  try {
    await emailService.sendEmail({
      to: user.email,
      subject: "Security Alert: Account Suspended - WallNet-Sec",
      text: `CRITICAL: Hello ${user.name},\n\nYour account has been suspended for security reasons: ${reason}\n\nAll API access has been revoked immediately.\n\nBest Regards,\nSecurity Team`,
      html: `<h2 style="color: red;">Security Alert</h2><h3>Hello ${user.name},</h3><p>Your account has been <strong>suspended</strong> for security reasons.</p><p><strong>Reason:</strong> ${reason}</p><p>All API access has been revoked immediately. Please contact the security team if you have questions.</p><br/><p>Best Regards,<br/>Security Team</p>`
    });
  } catch (err) {
    console.error("Failed to send suspension email:", err);
  }

  res.json({
    message: "Partner suspended.",
    user: { id: user._id, name: user.name, status: user.status },
  });
});

// ─── Update Partner Account ──────────────────────────────────────────────────

const updatePartnerAccount = asyncHandler(async (req, res) => {
  const userId = assertRequiredString("userId", req.params.userId, {
    min: 1,
    max: 100,
  });

  const { apiLimit, status, trialStartDate, trialExpiresAt } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const oldData = {
    apiLimit: user.apiLimit,
    status: user.status,
    trialStartDate: user.trialStartDate,
    trialExpiresAt: user.trialExpiresAt,
  };

  if (apiLimit !== undefined) {
    user.apiLimit = assertInteger("apiLimit", apiLimit, { min: 0 });
  }

  if (status !== undefined) {
    user.status = assertRequiredString("status", status, {
      min: 1,
      max: 20,
    });
  }

  if (trialStartDate !== undefined) {
    user.trialStartDate = new Date(trialStartDate);
  }

  if (trialExpiresAt !== undefined) {
    user.trialExpiresAt = new Date(trialExpiresAt);
  }

  await user.save();

  await logEvent({
    action: "ADMIN_PARTNER_ACCOUNT_UPDATE",
    severity: "info",
    ownerUserId: userId,
    metadata: {
      old: oldData,
      new: {
        apiLimit: user.apiLimit,
        status: user.status,
        trialStartDate: user.trialStartDate,
        trialExpiresAt: user.trialExpiresAt,
      },
      updatedBy: req.admin?.email,
    },
  });

  res.json({
    message: "Partner account updated successfully",
    user: {
      id: user._id,
      apiLimit: user.apiLimit,
      status: user.status,
      trialStartDate: user.trialStartDate,
      trialExpiresAt: user.trialExpiresAt,
    },
  });
});

/**
 * ─── Send Email to Partner ──────────────────────────────────────────────────
 */
const sendPartnerEmail = asyncHandler(async (req, res) => {
  const userId = assertRequiredString("userId", req.params.userId, {
    min: 1,
    max: 100,
  });

  const { subject, message, attachments } = req.body;
  assertRequiredString("subject", subject, { min: 1, max: 200 });
  assertRequiredString("message", message, { min: 1, max: 50000 }); // Larger for HTML

  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const decryptedEmail = decryptString(user.email);
  const decryptedName = decryptString(user.name);

  await emailService.sendEmail({
    to: decryptedEmail,
    subject: subject,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="color: #ef4444;">Message from WallNet-Sec Support</h2>
        <p>Hello ${decryptedName},</p>
        <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; line-height: 1.6;">
          ${message}
        </div>
        <p style="font-size: 11px; color: #64748b; margin-top: 25px; border-top: 1px solid #f1f5f9; pt-10">
          This message was sent by the platform administrator regarding your account.
        </p>
      </div>
    `,
    attachments: attachments || []
  });

  await logEvent({
    action: "ADMIN_PARTNER_EMAIL_SENT",
    severity: "info",
    ownerUserId: userId,
    metadata: {
      subject,
      sentBy: req.admin?.email,
    },
  });

  res.json({ message: "Email sent successfully" });
});

/**
 * ─── Send Test Email ────────────────────────────────────────────────────────
 */
const sendTestEmail = asyncHandler(async (req, res) => {
  const { to } = req.body;
  assertRequiredString("to", to, { min: 5, max: 200 });

  try {
    await emailService.sendEmail({
      to,
      subject: "WallNet-Sec SMTP Test Connection",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #059669;">✅ SMTP Connection Successful</h2>
          <p>This is a test email from your WallNet-Sec Super Admin Console.</p>
          <p>If you received this, your SMTP settings in the <code>.env</code> file or <code>AdminSettings</code> are correctly configured.</p>
          <hr style="margin: 20px 0; border: 0; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #64748b;">Sent at: ${new Date().toUTCString()}</p>
        </div>
      `,
    });
    res.json({ message: "Test email sent successfully" });
  } catch (err) {
    console.error("SMTP Test failed:", err);
    res.status(500).json({ 
      message: "SMTP Connection failed", 
      error: err.message,
      code: err.code,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
});

// ─── Approve API Key ────────────────────────────────────────────────────────

const approveApiKey = asyncHandler(async (req, res) => {
  const keyId = assertRequiredString("keyId", req.params.keyId, {
    min: 1,
    max: 100,
  });

  const key = await PartnerKey.findById(keyId);
  if (!key) {
    throw new HttpError(404, "API key not found");
  }

  key.approvalStatus = "approved";
  key.approvedAt = new Date();
  key.active = true;
  key.rejectedAt = null;
  key.rejectionReason = "";
  await key.save();

  await logEvent({
    action: "SUPER_ADMIN_APPROVE_API_KEY",
    userId: "superadmin",
    req,
    metadata: {
      keyId: key.keyId,
      partnerId: key.partnerId,
      ownerUserId: key.ownerUserId,
    },
  });

  res.json({
    message: "API key approved and activated",
    key: {
      id: key._id,
      keyId: key.keyId,
      partnerId: key.partnerId,
      approvalStatus: key.approvalStatus,
      active: key.active,
    },
  });
});

// ─── Reject API Key ─────────────────────────────────────────────────────────

const rejectApiKey = asyncHandler(async (req, res) => {
  const keyId = assertRequiredString("keyId", req.params.keyId, {
    min: 1,
    max: 100,
  });
  const reason = assertOptionalString("reason", req.body.reason, { max: 500 }) || "Rejected by admin";

  const key = await PartnerKey.findById(keyId);
  if (!key) {
    throw new HttpError(404, "API key not found");
  }

  key.approvalStatus = "rejected";
  key.rejectedAt = new Date();
  key.rejectionReason = reason;
  key.active = false;
  await key.save();

  await logEvent({
    action: "SUPER_ADMIN_REJECT_API_KEY",
    userId: "superadmin",
    req,
    metadata: {
      keyId: key.keyId,
      partnerId: key.partnerId,
      ownerUserId: key.ownerUserId,
      reason,
    },
  });

  res.json({
    message: "API key rejected",
    key: {
      id: key._id,
      keyId: key.keyId,
      partnerId: key.partnerId,
      approvalStatus: key.approvalStatus,
      active: key.active,
    },
  });
});

// ─── List All API Keys (Admin View) ─────────────────────────────────────────

const listAllApiKeys = asyncHandler(async (req, res) => {
  const { limit, page, skip } = parsePagination(req.query, {
    defaultLimit: 50,
    maxLimit: 200,
  });
  const statusFilter = req.query.approvalStatus || undefined;
  const activeFilter = req.query.active;

  const filter = {};
  if (statusFilter && ["pending", "approved", "rejected"].includes(statusFilter)) {
    filter.approvalStatus = statusFilter;
  }
  if (activeFilter === "true") filter.active = true;
  if (activeFilter === "false") filter.active = false;

  const [items, total] = await Promise.all([
    PartnerKey.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v -keySecretHash -webhookSecret -apiKeyEncrypted -apiKey")
      .lean(),
    PartnerKey.countDocuments(filter),
  ]);

  // Enrich with owner info
  const enriched = await Promise.all(
    items.map(async (key) => {
      const owner = await User.findById(key.ownerUserId)
        .select("name email status")
        .lean();
      return {
        ...key,
        id: key._id,
        apiKey:
          key.apiKeyPreview
            ? `${"•".repeat(24)}${key.apiKeyPreview}`
            : "",
        ownerName: owner?.name || "Unknown",
        ownerEmail: owner?.email || "Unknown",
        ownerStatus: owner?.status || "unknown",
      };
    })
  );

  res.json({
    items: enriched,
    page,
    limit,
    total,
    hasNextPage: skip + items.length < total,
  });
});

// ─── API Usage Analytics ────────────────────────────────────────────────────

const getApiAnalytics = asyncHandler(async (req, res) => {
  const days =
    req.query.days
      ? assertInteger("days", req.query.days, { min: 1, max: 90 })
      : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    topPartnersByUsage,
    topKeysByUsage,
    usageByDay,
    keysByMode,
    keysByApproval,
    totalUsage,
  ] = await Promise.all([
    // Top partners by total API usage
    PartnerKey.aggregate([
      { $group: { _id: "$partnerId", totalUsage: { $sum: "$usageCount" }, keyCount: { $sum: 1 } } },
      { $sort: { totalUsage: -1 } },
      { $limit: 20 },
    ]),
    // Top keys by usage
    PartnerKey.find()
      .sort({ usageCount: -1 })
      .limit(20)
      .select("keyId partnerId ownerUserId mode usageCount lastUsedAt active approvalStatus")
      .lean(),
    // Audit events by day
    AuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          action: { $in: ["INIT_AUTH", "VERIFY_PASS", "VERIFY_FAIL", "SESSION_LOCKED", "API_KEY_GENERATED"] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: 1 },
          initAuth: { $sum: { $cond: [{ $eq: ["$action", "INIT_AUTH"] }, 1, 0] } },
          verifyPass: { $sum: { $cond: [{ $eq: ["$action", "VERIFY_PASS"] }, 1, 0] } },
          verifyFail: { $sum: { $cond: [{ $eq: ["$action", "VERIFY_FAIL"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Keys by mode
    PartnerKey.aggregate([
      { $group: { _id: "$mode", count: { $sum: 1 } } },
    ]),
    // Keys by approval status
    PartnerKey.aggregate([
      { $group: { _id: "$approvalStatus", count: { $sum: 1 } } },
    ]),
    // Total usage
    PartnerKey.aggregate([
      { $group: { _id: null, total: { $sum: "$usageCount" } } },
    ]),
  ]);

  // Enrich top keys with owner name
  const enrichedTopKeys = await Promise.all(
    topKeysByUsage.map(async (key) => {
      const owner = await User.findById(key.ownerUserId)
        .select("name")
        .lean();
      return {
        ...key,
        ownerName: owner?.name || "Unknown",
      };
    })
  );

  res.json({
    days,
    totalUsage: totalUsage[0]?.total || 0,
    topPartnersByUsage,
    topKeysByUsage: enrichedTopKeys,
    usageByDay,
    keysByMode,
    keysByApproval,
    generatedAt: new Date().toISOString(),
  });
});

/**
 * ─── Security Analytics (Threat Map) ─────────────────────────────────────────
 */
const getSecurityAnalytics = asyncHandler(async (req, res) => {
  const days = req.query.days ? assertInteger("days", req.query.days, { min: 1, max: 90 }) : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    securityEvents,
    topRiskPartners,
    riskDistribution,
    webhookFailures,
  ] = await Promise.all([
    // Grouped security events
    AuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          action: { $in: ["VERIFY_FAIL", "SESSION_LOCKED", "HONEYPOT_HIT", "IMPOSSIBLE_TRAVEL", "DEVICE_TRUST_LOW"] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          failed: { $sum: { $cond: [{ $eq: ["$action", "VERIFY_FAIL"] }, 1, 0] } },
          locked: { $sum: { $cond: [{ $eq: ["$action", "SESSION_LOCKED"] }, 1, 0] } },
          honeypot: { $sum: { $cond: [{ $eq: ["$action", "HONEYPOT_HIT"] }, 1, 0] } },
          risk: { $sum: { $cond: [{ $in: ["$action", ["IMPOSSIBLE_TRAVEL", "DEVICE_TRUST_LOW"]] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Partners with highest failure rates
    AuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          action: { $in: ["VERIFY_FAIL", "VERIFY_PASS"] },
        },
      },
      {
        $group: {
          _id: "$partnerId",
          failed: { $sum: { $cond: [{ $eq: ["$action", "VERIFY_FAIL"] }, 1, 0] } },
          passed: { $sum: { $cond: [{ $eq: ["$action", "VERIFY_PASS"] }, 1, 0] } },
        },
      },
      {
        $project: {
          partnerId: "$_id",
          failed: 1,
          passed: 1,
          total: { $add: ["$failed", "$passed"] },
          failureRate: {
            $cond: [
              { $eq: [{ $add: ["$failed", "$passed"] }, 0] },
              0,
              { $divide: ["$failed", { $add: ["$failed", "$passed"] }] },
            ],
          },
        },
      },
      { $sort: { failureRate: -1 } },
      { $limit: 10 },
    ]),
    // Severity distribution
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]),
    // Webhook failures
    require("../models/webhookLog.model").aggregate([
      { $match: { createdAt: { $gte: since }, success: false } },
      { $group: { _id: "$partnerId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  res.json({
    days,
    securityEvents,
    topRiskPartners,
    riskDistribution,
    webhookFailures,
    generatedAt: new Date().toISOString(),
  });
});

// ─── Get Admin Settings ─────────────────────────────────────────────────────

const getSettings = asyncHandler(async (_req, res) => {
  const settings = await AdminSettings.getSettings();
  res.json({ settings });
});

// ─── Update Admin Settings ──────────────────────────────────────────────────

const updateSettings = asyncHandler(async (req, res) => {
  const allowedFields = [
    "trialDurationDays",
    "trialEnabled",
    "paymentAmount",
    "paymentCurrency",
    "paymentMessage",
    "paymentLink",
    "requireApiApproval",
    "autoActivateOnSignup",
    "maxApiKeysPerUser",
    "deactivationMessage",
    "trialExpiredMessage",
    "pendingApprovalMessage",
    "announcementText",
    "announcementEnabled",
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, "No valid fields to update");
  }

  const settings = await AdminSettings.updateSettings(updates);

  await logEvent({
    action: "SUPER_ADMIN_UPDATE_SETTINGS",
    userId: "superadmin",
    req,
    metadata: { updatedFields: Object.keys(updates) },
  });

  res.json({
    message: "Settings updated successfully",
    settings,
  });
});

// ─── Get Audit Logs (All) ───────────────────────────────────────────────────

const getAdminAuditLogs = asyncHandler(async (req, res) => {
  const { limit, page, skip } = parsePagination(req.query, {
    defaultLimit: 50,
    maxLimit: 200,
  });
  const action = req.query.action || undefined;
  const sinceHours =
    req.query.sinceHours
      ? assertInteger("sinceHours", req.query.sinceHours, { min: 1, max: 720 })
      : undefined;

  const filter = {};
  if (action) filter.action = action;
  if (sinceHours) {
    filter.createdAt = {
      $gte: new Date(Date.now() - sinceHours * 60 * 60 * 1000),
    };
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    limit,
    total,
    hasNextPage: skip + items.length < total,
  });
});

// ─── Extend Trial ───────────────────────────────────────────────────────────

const extendTrial = asyncHandler(async (req, res) => {
  const userId = assertRequiredString("userId", req.params.userId, {
    min: 1,
    max: 100,
  });
  const additionalDays = assertInteger("days", req.body.days, {
    min: 1,
    max: 365,
  });

  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }

  const currentExpiry = user.trialExpiresAt || new Date();
  const baseDate = new Date(Math.max(currentExpiry.getTime(), Date.now()));
  user.trialExpiresAt = new Date(
    baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000
  );
  user.status = "trial";
  user.deactivatedAt = null;
  user.deactivatedReason = "";
  await user.save();

  await logEvent({
    action: "SUPER_ADMIN_EXTEND_TRIAL",
    userId: "superadmin",
    req,
    metadata: {
      targetUserId: userId,
      additionalDays,
      newExpiresAt: user.trialExpiresAt,
    },
  });

  res.json({
    message: `Trial extended by ${additionalDays} days`,
    user: {
      id: user._id,
      name: user.name,
      status: user.status,
      trialExpiresAt: user.trialExpiresAt,
    },
  });
});

/**
 * ─── Impersonate Partner ──────────────────────────────────────────────────
 */
const impersonatePartner = asyncHandler(async (req, res) => {
  const userId = assertRequiredString("userId", req.params.userId, {
    min: 1,
    max: 100,
  });

  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "Partner not found");
  }

  // Generate a token as if it was the partner themselves
  // We use their real sub and email, but we log that it was an impersonation
  const token = signToken(
    { sub: user._id.toString(), email: user.email, role: user.role || "user", impersonated: true },
    { secret: env.tokenSecret, expiresInSec: 60 * 60 } // 1 hour for impersonation
  );

  await logEvent({
    action: "SUPER_ADMIN_IMPERSONATE_PARTNER",
    userId: "superadmin",
    req,
    metadata: { 
      targetUserId: userId, 
      targetEmail: user.email,
      adminEmail: req.admin?.email 
    },
  });

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    message: `You are now impersonating ${user.name}. Session valid for 1 hour.`
  });
});

/**
 * ─── Prune Inactive Trials ──────────────────────────────────────────────────
 */
const pruneInactiveTrials = asyncHandler(async (req, res) => {
  const days = assertInteger("days", req.body.days || 30, { min: 1, max: 365 });
  const cutOff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await User.updateMany(
    { 
      status: "trial", 
      trialExpiresAt: { $lte: cutOff },
      apiUsage: 0 // Only prune if they never used it
    },
    { $set: { status: "inactive", deactivatedReason: "Pruned due to inactivity" } }
  );

  await logEvent({
    action: "SUPER_ADMIN_PRUNE_TRIALS",
    userId: "superadmin",
    req,
    metadata: { days, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount },
  });

  res.json({ 
    message: `Pruned ${result.modifiedCount} inactive trial accounts.`,
    stats: result 
  });
});

module.exports = {
  login,
  getDashboardOverview,
  listPartners,
  getPartnerDetail,
  updatePartnerAccount,
  sendPartnerEmail,
  sendTestEmail,
  activatePartner,
  deactivatePartner,
  suspendPartner,
  approveApiKey,
  rejectApiKey,
  listAllApiKeys,
  getApiAnalytics,
  getSettings,
  updateSettings,
  getAdminAuditLogs,
  extendTrial,
  impersonatePartner,
  pruneInactiveTrials,
  getSecurityAnalytics,
};
