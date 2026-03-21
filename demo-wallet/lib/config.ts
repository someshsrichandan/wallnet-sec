const DEFAULT_VISUAL_API_BASE = "http://localhost:3000/api";
const DEFAULT_VISUAL_VERIFY_ORIGIN = "http://localhost:3001";
const DEFAULT_DEMO_WALLET_ORIGIN = "http://localhost:3004";
const DEFAULT_PARTNER_ID = "nexus_wallet";
const DEFAULT_COOKIE_SECRET = "change-demo-wallet-cookie-secret";

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
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
};

export const demoWalletConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  visualApiBase: String(
    process.env.VISUAL_BACKEND_API_BASE_URL || DEFAULT_VISUAL_API_BASE,
  )
    .trim()
    .replace(/\/+$/, ""),
  visualVerifyOrigin: normalizeOrigin(
    process.env.VISUAL_VERIFY_ORIGIN || DEFAULT_VISUAL_VERIFY_ORIGIN,
    DEFAULT_VISUAL_VERIFY_ORIGIN,
  ),
  publicOrigin: normalizeOrigin(
    process.env.DEMO_WALLET_PUBLIC_ORIGIN || DEFAULT_DEMO_WALLET_ORIGIN,
    DEFAULT_DEMO_WALLET_ORIGIN,
  ),
  partnerId: String(process.env.VISUAL_PARTNER_ID || DEFAULT_PARTNER_ID)
    .trim()
    .toLowerCase(),

  // ── Razorpay-style credentials ──────────────────────────────────
  partnerKeyId: String(process.env.VISUAL_KEY_ID || process.env.VISUAL_API_KEY || "").trim(),
  partnerKeySecret: String(process.env.VISUAL_KEY_SECRET || "").trim(),

  // Legacy fallback
  partnerApiKey: String(process.env.VISUAL_API_KEY || "").trim(),

  visualAdminUrl:
    String(process.env.VISUAL_ADMIN_URL || "").trim() ||
    `${normalizeOrigin(
      process.env.VISUAL_VERIFY_ORIGIN || DEFAULT_VISUAL_VERIFY_ORIGIN,
      DEFAULT_VISUAL_VERIFY_ORIGIN,
    )}/admin`,
  cookieSecret: String(process.env.DEMO_WALLET_COOKIE_SECRET || DEFAULT_COOKIE_SECRET).trim(),
  walletSessionHours: toInt(process.env.DEMO_WALLET_SESSION_HOURS, 12),
  pendingSessionMinutes: toInt(process.env.DEMO_WALLET_PENDING_MINUTES, 10),
  mongodbUri: String(process.env.MONGODB_URI || "").trim(),
};

/**
 * Build auth headers for the WallNet SaaS API.
 * Uses Razorpay-style Basic auth: base64(key_id:key_secret)
 * Falls back to legacy x-api-key if key_secret is not configured.
 */
export const buildAuthHeaders = (): Record<string, string> => {
  const { partnerKeyId, partnerKeySecret, partnerApiKey } = demoWalletConfig;

  if (partnerKeyId && partnerKeySecret) {
    const credentials = Buffer.from(`${partnerKeyId}:${partnerKeySecret}`).toString("base64");
    return { Authorization: `Basic ${credentials}` };
  }

  if (partnerApiKey) {
    return { "x-api-key": partnerApiKey };
  }

  if (partnerKeyId) {
    return { "x-api-key": partnerKeyId };
  }

  return {};
};

export const demoWalletWarnings = (() => {
  const warnings: string[] = [];
  if (!demoWalletConfig.isProduction) return warnings;
  if (!demoWalletConfig.partnerKeyId)
    warnings.push("VISUAL_KEY_ID is not set. API authentication will fail.");
  if (!demoWalletConfig.partnerKeySecret)
    warnings.push("VISUAL_KEY_SECRET is not set. Using legacy x-api-key auth (less secure).");
  if (demoWalletConfig.cookieSecret === DEFAULT_COOKIE_SECRET)
    warnings.push(
      "DEMO_WALLET_COOKIE_SECRET is using the insecure default. Set a long random secret.",
    );
  return warnings;
})();
