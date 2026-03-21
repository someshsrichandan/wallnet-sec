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
    .select("-__v -keySecretHash -webhookSecret")
    .lean();

  // Show key_id in full, never show secret
  const masked = keys.map((key) => ({
    id: key._id,
    partnerId: key.partnerId,
    label: key.label,
    keyId: key.keyId,
    mode: key.mode,
    webhookUrl: key.webhookUrl,
    callbackAllowlist: key.callbackAllowlist,
    active: key.active,
    usageCount: key.usageCount,
    lastUsedAt: key.lastUsedAt,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
    // Legacy field display (if present)
    apiKey: key.apiKey || undefined,
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

  // Generate Razorpay-style key pair
  const { keyId, keySecret, keySecretHash, webhookSecret } =
    await PartnerKey.generateKeyPair(mode);

  const partnerKey = await PartnerKey.create({
    partnerId,
    ownerUserId,
    label,
    keyId,
    keySecretHash,
    webhookSecret,
    mode,
    webhookUrl,
    callbackAllowlist,
  });

  await logEvent({
    action: "API_KEY_GENERATED",
    partnerId,
    userId: ownerUserId,
    req,
    metadata: { keyId, mode, label },
  });

  // ⚠ Return the full key_id + key_secret + webhook_secret ONLY on creation (one-time visible)
  res.status(201).json({
    id: partnerKey._id,
    partnerId: partnerKey.partnerId,
    label: partnerKey.label,
    key_id: keyId,
    key_secret: keySecret,
    webhook_secret: webhookSecret,
    mode: partnerKey.mode,
    webhookUrl: partnerKey.webhookUrl,
    callbackAllowlist: partnerKey.callbackAllowlist,
    createdAt: partnerKey.createdAt,
    message:
      "Save your key_id and key_secret securely — the key_secret will NOT be shown again. " +
      "Use them as: Authorization: Basic base64(key_id:key_secret)",
    usage_example: {
      header: `Authorization: Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      curl: `curl -u ${keyId}:${keySecret} https://your-api.com/api/visual-password/v1/init-auth`,
    },
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

  const newSecret = await existing.rotateSecret();
  await existing.save();

  await logEvent({
    action: "API_KEY_ROTATED",
    partnerId: existing.partnerId,
    userId: ownerUserId,
    req,
    metadata: {
      keyId: existing.keyId,
      mode: existing.mode,
    },
  });

  res.json({
    id: existing._id,
    partnerId: existing.partnerId,
    key_id: existing.keyId,
    key_secret: newSecret,
    mode: existing.mode,
    message:
      "Key secret rotated. Save the new key_secret — it will NOT be shown again. " +
      "The key_id remains the same.",
    usage_example: {
      header: `Authorization: Basic ${Buffer.from(`${existing.keyId}:${newSecret}`).toString("base64")}`,
    },
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
    metadata: { keyId: existing.keyId, mode: existing.mode },
  });

  res.json({ message: "API key revoked", id: keyId, key_id: existing.keyId });
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
    key_id: existing.keyId,
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
    key_id: existing.keyId,
    mode: existing.mode,
    usageCount: existing.usageCount,
    lastUsedAt: existing.lastUsedAt,
    active: existing.active,
    createdAt: existing.createdAt,
  });
});

// ─── Test Key Credentials ───────────────────────────────────────────────────

const testCredentials = asyncHandler(async (req, res) => {
  // This endpoint is protected by partnerApiKey middleware,
  // so if we reach here, credentials are valid
  const { partner } = req;

  res.json({
    ok: true,
    message: "API credentials are valid",
    key_id: partner?.keyId || "env-based",
    partnerId: partner?.partnerId || "unknown",
    mode: partner?.mode || "unknown",
    authMethod: partner?.authMethod || "unknown",
    timestamp: new Date().toISOString(),
  });
});

module.exports = {
  listKeys,
  generateKey,
  rotateKey,
  revokeKey,
  updateKey,
  getKeyUsage,
  testCredentials,
};
