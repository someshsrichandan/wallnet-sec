const env = require("../config/env");
const HttpError = require("../utils/httpError");
const PartnerKey = require("../models/partnerKey.model");

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
        return next(new HttpError(403, "Invalid API key_id"));
      }

      const secretValid = await partnerKey.verifySecret(keySecret);
      if (!secretValid) {
        return next(new HttpError(403, "Invalid API key_secret"));
      }

      // Track usage
      partnerKey.usageCount += 1;
      partnerKey.lastUsedAt = new Date();
      await partnerKey.save();

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
      // Try matching by legacy apiKey field first, then by keyId
      const query = { active: true, $or: [{ apiKey: apiKeyRaw }, { keyId: apiKeyRaw }] };
      if (partnerId && partnerId !== "*") {
        query.partnerId = partnerId;
      }
      const partnerKey = await PartnerKey.findOne(query);
      if (partnerKey) {
        accepted = true;
        // Track usage
        partnerKey.usageCount += 1;
        partnerKey.lastUsedAt = new Date();
        await partnerKey.save();
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
