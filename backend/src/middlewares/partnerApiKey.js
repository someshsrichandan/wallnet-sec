const env = require("../config/env");
const HttpError = require("../utils/httpError");
const PartnerKey = require("../models/partnerKey.model");
const DailyUsage = require("../models/dailyUsage.model");
const { hashDeterministic } = require("../utils/fieldEncryption");

/**
 * Razorpay-style partner authentication middleware.
 *
 * Accepts credentials in two ways (checked in order):
 *
 * 1. Authorization: Basic base64(key_id:key_secret)     ← new Razorpay-style
 * 2. x-api-key: <key>                                    ← legacy (env-based keys)
 *
 * On success, attaches to req:
 *   req.partner = { keyId, partnerId, mode, ownerUserId, keyDocId, authMethod }
 *   req.partnerApiKeyValidated = true
 */
const trackUsage = async (owner, partnerKey) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Increment counters
  partnerKey.usageCount += 1;
  partnerKey.lastUsedAt = new Date();
  await partnerKey.save();

  owner.apiUsage += 1;
  await owner.save();

  // Async: Increment daily usage (don't block the request)
  DailyUsage.findOneAndUpdate(
    { ownerUserId: owner._id, date: today },
    { 
      $inc: { count: 1 },
      $setOnInsert: { partnerId: partnerKey.partnerId }
    },
    { upsert: true, new: true }
  ).catch(err => console.error("Failed to track daily usage:", err));
};

module.exports = async (req, _res, next) => {
  // ── 1. Try Authorization: Basic header (Razorpay-style) ───────────
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    const colonIndex = decoded.indexOf(":");
    if (colonIndex < 1) {
      return next(new HttpError(401, "Invalid Basic auth credentials format"));
    }

    const keyId = decoded.slice(0, colonIndex).trim();
    const keySecret = decoded.slice(colonIndex + 1).trim();

    if (!keyId || !keySecret) {
      return next(new HttpError(401, "key_id and key_secret are both required"));
    }

    try {
      const partnerKey = await PartnerKey.findOne({ keyId, active: true });
      if (!partnerKey) {
        return next(new HttpError(403, "Invalid API key_id or key is disabled"));
      }

      if (partnerKey.approvalStatus !== "approved") {
        return next(new HttpError(403, "API key is pending admin approval or has been rejected"));
      }

      // Check owner user status
      const User = require("../models/user.model");
      const owner = await User.findById(partnerKey.ownerUserId);
      if (!owner) {
         return next(new HttpError(403, "API key owner account not found"));
      }
      if (owner.status === "inactive" || owner.status === "suspended") {
         return next(new HttpError(403, `API key owner account is ${owner.status}`));
      }
      if (owner.status === "trial" && owner.trialExpiresAt && new Date(owner.trialExpiresAt) <= new Date()) {
         return next(new HttpError(403, "API key owner trial period has expired"));
      }

      if (owner.apiUsage >= owner.apiLimit) {
         return next(new HttpError(429, "API usage limit exceeded. Please contact support to upgrade."));
      }

      const secretValid = await partnerKey.verifySecret(keySecret);
      if (!secretValid) {
        return next(new HttpError(403, "Invalid API key_secret"));
      }

      // Track usage
      await trackUsage(owner, partnerKey);

      // Attach partner info for downstream
      req.partner = {
        keyId: partnerKey.keyId,
        partnerId: partnerKey.partnerId,
        mode: partnerKey.mode,
        ownerUserId: partnerKey.ownerUserId,
        keyDocId: partnerKey._id.toString(),
        webhookSecret: partnerKey.webhookSecret,
        authMethod: "basic",
      };
      req.partnerApiKeyValidated = true;
      req.partnerKeyOwnerId = partnerKey.ownerUserId;
      req.partnerKeyId = partnerKey._id.toString();
      req.partnerKeyMode = partnerKey.mode;
      return next();
    } catch (dbError) {
      console.error("[partnerApiKey] Basic auth DB lookup failed:", dbError.message);
      return next(new HttpError(500, "Authentication service unavailable"));
    }
  }

  // ── 2. Fallback: x-api-key header (legacy env-based keys) ────────
  const apiKeyRaw = String(req.get("x-api-key") || "").trim();
  if (!apiKeyRaw) {
    return next(
      new HttpError(
        401,
        "Authentication required. Use Authorization: Basic base64(key_id:key_secret) or x-api-key header.",
      ),
    );
  }

  const partnerId = String(
    req.body?.partnerId || req.query?.partnerId || req.params?.partnerId || "*",
  )
    .trim()
    .toLowerCase();
  const directSet = env.partnerApiKeys.get(partnerId) || new Set();
  const wildcardSet = env.partnerApiKeys.get("*") || new Set();
  const apiKey =
    apiKeyRaw.includes(":") ?
      apiKeyRaw.split(":").slice(-1)[0].trim()
      : apiKeyRaw;

  let accepted =
    directSet.has(apiKeyRaw) ||
    wildcardSet.has(apiKeyRaw) ||
    directSet.has(apiKey) ||
    wildcardSet.has(apiKey);

  // Some partner endpoints (consume-result/session status) may not include partnerId.
  // In that case, accept the key if it matches any configured partner key.
  if (!accepted && (partnerId === "*" || !partnerId)) {
    for (const set of env.partnerApiKeys.values()) {
      if (set.has(apiKeyRaw) || set.has(apiKey)) {
        accepted = true;
        break;
      }
    }
  }

  // Check database-stored API keys (legacy apiKey field or new keyId lookup)
  if (!accepted) {
    try {
      const query = {
        $or: [
          { apiKeyHash: hashDeterministic(apiKeyRaw) },
          { apiKeyHash: hashDeterministic(apiKey) },
          // Legacy fallback for old plaintext rows before migration
          { apiKey: apiKeyRaw },
          { apiKey },
        ],
        active: true,
      };
      if (partnerId && partnerId !== "*") {
        query.partnerId = partnerId;
      }
      const partnerKey = await PartnerKey.findOne(query);
      if (partnerKey) {
        if (partnerKey.approvalStatus !== "approved") {
          return next(new HttpError(403, "API key is pending admin approval or has been rejected"));
        }

        const User = require("../models/user.model");
        const owner = await User.findById(partnerKey.ownerUserId);
        if (owner && (owner.status === "inactive" || owner.status === "suspended" || (owner.status === "trial" && owner.trialExpiresAt && new Date(owner.trialExpiresAt) <= new Date()))) {
          return next(new HttpError(403, "API key owner account is inactive, suspended, or trial has expired"));
        }

        if (owner && owner.apiUsage >= owner.apiLimit) {
          return next(new HttpError(429, "API usage limit exceeded. Please contact support to upgrade."));
        }

        accepted = true;
        // Track usage
        if (owner) {
          await trackUsage(owner, partnerKey);
        } else {
           partnerKey.usageCount += 1;
           partnerKey.lastUsedAt = new Date();
           await partnerKey.save();
        }
        // Attach owner info for downstream use
        req.partner = {
          keyId: partnerKey.keyId || partnerKey.apiKey,
          partnerId: partnerKey.partnerId,
          mode: partnerKey.mode,
          ownerUserId: partnerKey.ownerUserId,
          keyDocId: partnerKey._id.toString(),
          webhookSecret: partnerKey.webhookSecret || "",
          authMethod: "x-api-key",
        };
        req.partnerKeyOwnerId = partnerKey.ownerUserId;
        req.partnerKeyId = partnerKey._id.toString();
        req.partnerKeyMode = partnerKey.mode;
      }
    } catch (dbError) {
      // If DB lookup fails, fall through to rejection
      console.error("[partnerApiKey] DB lookup failed:", dbError.message);
    }
  }

  if (!accepted) {
    return next(new HttpError(403, "Invalid API key for partner"));
  }

  // For env-based keys, populate minimal partner info if not already set
  if (!req.partner) {
    req.partner = {
      keyId: apiKeyRaw,
      partnerId,
      mode: "live",
      ownerUserId: "",
      keyDocId: "",
      webhookSecret: "",
      authMethod: "x-api-key-env",
    };
  }

  req.partnerApiKeyValidated = true;
  return next();
};
