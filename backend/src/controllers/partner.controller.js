const PartnerKey = require("../models/partnerKey.model");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const {
  assertRequiredString,
  assertOptionalString,
  assertOptionalHttpUrl,
} = require("../utils/validators");
const { logEvent } = require("../services/auditLog.service");

const normalizePartnerId = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

// ─── List Partner Keys ──────────────────────────────────────────────────────

const listKeys = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;

  const keys = await PartnerKey.find({ ownerUserId })
    .sort({ createdAt: -1 })
    .select("-__v")
    .lean();

  // Mask API keys — only show last 8 chars
  const masked = keys.map((key) => ({
    ...key,
    apiKey:
      key.apiKey ?
        `${"•".repeat(Math.max(0, key.apiKey.length - 8))}${key.apiKey.slice(-8)}`
      : "",
    apiKeyPreview: key.apiKey ? key.apiKey.slice(-8) : "",
  }));

  res.json({ keys: masked });
});

// ─── Generate New Key ───────────────────────────────────────────────────────

const generateKey = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const partnerId = normalizePartnerId(
    assertRequiredString("partnerId", req.body.partnerId, { min: 3, max: 80 }),
  );
  const label = assertOptionalString("label", req.body.label, { max: 100 });
  const mode = req.body.mode === "live" ? "live" : "test";
  const webhookUrl = assertOptionalHttpUrl("webhookUrl", req.body.webhookUrl);

  const callbackAllowlist =
    Array.isArray(req.body.callbackAllowlist) ?
      req.body.callbackAllowlist
        .map((url) =>
          String(url || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean)
        .slice(0, 10)
    : [];

  // Limit keys per user
  const existingCount = await PartnerKey.countDocuments({ ownerUserId });
  if (existingCount >= 20) {
    throw new HttpError(429, "Maximum of 20 API keys per account");
  }

  const apiKey = PartnerKey.generateApiKey(mode);

  const partnerKey = await PartnerKey.create({
    partnerId,
    ownerUserId,
    label,
    apiKey,
    mode,
    webhookUrl,
    callbackAllowlist,
  });

  await logEvent({
    action: "API_KEY_GENERATED",
    partnerId,
    userId: ownerUserId,
    req,
    metadata: { keyId: partnerKey._id.toString(), mode, label },
  });

  // Return the full key only on creation (one-time visible)
  res.status(201).json({
    id: partnerKey._id,
    partnerId: partnerKey.partnerId,
    label: partnerKey.label,
    apiKey: partnerKey.apiKey,
    mode: partnerKey.mode,
    webhookUrl: partnerKey.webhookUrl,
    callbackAllowlist: partnerKey.callbackAllowlist,
    createdAt: partnerKey.createdAt,
    message: "Save this API key — it will not be shown again in full.",
  });
});

// ─── Rotate Key ─────────────────────────────────────────────────────────────

const rotateKey = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const keyId = assertRequiredString("keyId", req.params.keyId, {
    min: 10,
    max: 50,
  });

  const existing = await PartnerKey.findById(keyId);
  if (!existing) {
    throw new HttpError(404, "API key not found");
  }

  if (existing.ownerUserId !== ownerUserId) {
    throw new HttpError(403, "You can only rotate your own keys");
  }

  const oldKeyPreview = existing.apiKey.slice(-8);
  existing.apiKey = PartnerKey.generateApiKey(existing.mode);
  await existing.save();

  await logEvent({
    action: "API_KEY_ROTATED",
    partnerId: existing.partnerId,
    userId: ownerUserId,
    req,
    metadata: {
      keyId,
      oldKeyPreview,
      newKeyPreview: existing.apiKey.slice(-8),
      mode: existing.mode,
    },
  });

  res.json({
    id: existing._id,
    partnerId: existing.partnerId,
    apiKey: existing.apiKey,
    mode: existing.mode,
    message:
      "Key rotated. Save the new API key — it will not be shown again in full.",
  });
});

// ─── Revoke Key ─────────────────────────────────────────────────────────────

const revokeKey = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const keyId = assertRequiredString("keyId", req.params.keyId, {
    min: 10,
    max: 50,
  });

  const existing = await PartnerKey.findById(keyId);
  if (!existing) {
    throw new HttpError(404, "API key not found");
  }

  if (existing.ownerUserId !== ownerUserId) {
    throw new HttpError(403, "You can only revoke your own keys");
  }

  existing.active = false;
  await existing.save();

  await logEvent({
    action: "API_KEY_REVOKED",
    partnerId: existing.partnerId,
    userId: ownerUserId,
    req,
    metadata: { keyId, mode: existing.mode },
  });

  res.json({ message: "API key revoked", id: keyId });
});

// ─── Update Key (webhook URL, callback allowlist, label) ────────────────────

const updateKey = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const keyId = assertRequiredString("keyId", req.params.keyId, {
    min: 10,
    max: 50,
  });

  const existing = await PartnerKey.findById(keyId);
  if (!existing) {
    throw new HttpError(404, "API key not found");
  }

  if (existing.ownerUserId !== ownerUserId) {
    throw new HttpError(403, "You can only update your own keys");
  }

  if (req.body.label !== undefined) {
    existing.label = assertOptionalString("label", req.body.label, {
      max: 100,
    });
  }

  if (req.body.webhookUrl !== undefined) {
    existing.webhookUrl = assertOptionalHttpUrl(
      "webhookUrl",
      req.body.webhookUrl,
    );
  }

  if (Array.isArray(req.body.callbackAllowlist)) {
    existing.callbackAllowlist = req.body.callbackAllowlist
      .map((url) =>
        String(url || "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean)
      .slice(0, 10);
  }

  await existing.save();

  res.json({
    id: existing._id,
    partnerId: existing.partnerId,
    label: existing.label,
    webhookUrl: existing.webhookUrl,
    callbackAllowlist: existing.callbackAllowlist,
    mode: existing.mode,
    updatedAt: existing.updatedAt,
  });
});

// ─── Get Key Usage ──────────────────────────────────────────────────────────

const getKeyUsage = asyncHandler(async (req, res) => {
  const ownerUserId = req.auth.sub;
  const keyId = assertRequiredString("keyId", req.params.keyId, {
    min: 10,
    max: 50,
  });

  const existing = await PartnerKey.findById(keyId).lean();
  if (!existing) {
    throw new HttpError(404, "API key not found");
  }

  if (existing.ownerUserId !== ownerUserId) {
    throw new HttpError(403, "You can only view your own key usage");
  }

  res.json({
    id: existing._id,
    partnerId: existing.partnerId,
    mode: existing.mode,
    usageCount: existing.usageCount,
    lastUsedAt: existing.lastUsedAt,
    active: existing.active,
    createdAt: existing.createdAt,
  });
});

module.exports = {
  listKeys,
  generateKey,
  rotateKey,
  revokeKey,
  updateKey,
  getKeyUsage,
};
