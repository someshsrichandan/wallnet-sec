const env = require("../config/env");
const HttpError = require("../utils/httpError");
const PartnerKey = require("../models/partnerKey.model");

module.exports = async (req, _res, next) => {
  const apiKeyRaw = String(req.get("x-api-key") || "").trim();
  if (!apiKeyRaw) {
    return next(new HttpError(401, "x-api-key is required"));
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

  // Check database-stored API keys (generated via API Key Management)
  if (!accepted) {
    try {
      const query = { apiKey: apiKeyRaw, active: true };
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

  req.partnerApiKeyValidated = true;
  return next();
};
