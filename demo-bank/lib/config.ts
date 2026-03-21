const DEFAULT_VISUAL_API_BASE = "http://localhost:3000/api";
const DEFAULT_VISUAL_VERIFY_ORIGIN = "http://localhost:3001";
const DEFAULT_DEMO_BANK_ORIGIN = "http://localhost:3002";
const DEFAULT_PARTNER_ID = "hdfc_bank";
const DEFAULT_COOKIE_SECRET = "change-demo-bank-cookie-secret";

const normalizeOrigin = (value: string, fallback: string) => {
  const raw = String(value || fallback).trim();
  try {
    const parsed = new URL(raw);
    return parsed.origin;
  } catch {
    return fallback;
  }
};

const toInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

export const demoBankConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  visualApiBase: String(process.env.VISUAL_BACKEND_API_BASE_URL || DEFAULT_VISUAL_API_BASE).replace(
    /\/+$/,
    ""
  ),
  visualVerifyOrigin: normalizeOrigin(
    process.env.VISUAL_VERIFY_ORIGIN || DEFAULT_VISUAL_VERIFY_ORIGIN,
    DEFAULT_VISUAL_VERIFY_ORIGIN
  ),
  publicOrigin: normalizeOrigin(
    process.env.DEMO_BANK_PUBLIC_ORIGIN || DEFAULT_DEMO_BANK_ORIGIN,
    DEFAULT_DEMO_BANK_ORIGIN
  ),
  partnerId: String(process.env.VISUAL_PARTNER_ID || DEFAULT_PARTNER_ID)
    .trim()
    .toLowerCase(),

  // ── Razorpay-style credentials ────────────────────────────────────
  // key_id:  public identifier (always safe to store in config)
  // key_secret: private credential (keep in .env, never commit)
  partnerKeyId: String(process.env.VISUAL_KEY_ID || process.env.VISUAL_API_KEY || "").trim(),
  partnerKeySecret: String(process.env.VISUAL_KEY_SECRET || "").trim(),

  // Legacy: still used as fallback when key_secret is not yet configured
  partnerApiKey: String(process.env.VISUAL_API_KEY || "").trim(),

  visualAdminUrl: String(process.env.VISUAL_ADMIN_URL || "").trim() || `${normalizeOrigin(
    process.env.VISUAL_VERIFY_ORIGIN || DEFAULT_VISUAL_VERIFY_ORIGIN,
    DEFAULT_VISUAL_VERIFY_ORIGIN
  )}/admin`,
  cookieSecret: String(process.env.DEMO_BANK_COOKIE_SECRET || DEFAULT_COOKIE_SECRET).trim(),
  bankSessionHours: toInt(process.env.DEMO_BANK_SESSION_HOURS, 12),
  pendingSessionMinutes: toInt(process.env.DEMO_BANK_PENDING_MINUTES, 10),
  mongodbUri: process.env.MONGODB_URI || "",
};

/**
 * Build the Authorization header value for the WallNet SaaS API.
 * Uses Razorpay-style Basic auth: base64(key_id:key_secret)
 * Falls back to legacy x-api-key if key_secret is not configured.
 */
export const buildAuthHeaders = (): Record<string, string> => {
  const { partnerKeyId, partnerKeySecret, partnerApiKey } = demoBankConfig;

  // New Razorpay-style: Basic auth with key_id:key_secret
  if (partnerKeyId && partnerKeySecret) {
    const credentials = Buffer.from(`${partnerKeyId}:${partnerKeySecret}`).toString("base64");
    return { Authorization: `Basic ${credentials}` };
  }

  // Legacy fallback: x-api-key header
  if (partnerApiKey) {
    return { "x-api-key": partnerApiKey };
  }

  // If key_id is set but no secret, use it as x-api-key (env-based key)
  if (partnerKeyId) {
    return { "x-api-key": partnerKeyId };
  }

  return {};
};

export const demoBankWarnings = (() => {
  const warnings: string[] = [];
  if (!demoBankConfig.isProduction) {
    return warnings;
  }

  if (!demoBankConfig.partnerKeyId) {
    warnings.push("VISUAL_KEY_ID is not set. API authentication will fail.");
  }
  if (!demoBankConfig.partnerKeySecret) {
    warnings.push("VISUAL_KEY_SECRET is not set. Using legacy x-api-key auth (less secure).");
  }
  if (demoBankConfig.cookieSecret === DEFAULT_COOKIE_SECRET || demoBankConfig.cookieSecret.length < 24) {
    warnings.push("DEMO_BANK_COOKIE_SECRET must be a strong random value (24+ chars).");
  }
  if (!demoBankConfig.publicOrigin.startsWith("https://")) {
    warnings.push("DEMO_BANK_PUBLIC_ORIGIN should use HTTPS in production.");
  }
  if (!demoBankConfig.visualVerifyOrigin.startsWith("https://")) {
    warnings.push("VISUAL_VERIFY_ORIGIN should use HTTPS in production.");
  }
  return warnings;
})();
