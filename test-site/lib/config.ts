const normalizeOrigin = (value: string, fallback: string) => {
  const raw = String(value || fallback).trim();
  try {
    return new URL(raw).origin;
  } catch {
    return fallback;
  }
};

export const siteConfig = {
  publicOrigin: normalizeOrigin(
    process.env.SITE_PUBLIC_ORIGIN || "http://localhost:3003",
    "http://localhost:3003",
  ),
  visualApiBase: String(
    process.env.VISUAL_BACKEND_API_BASE_URL || "http://localhost:3000/api",
  ).replace(/\/+$/, ""),
  visualVerifyOrigin: normalizeOrigin(
    process.env.VISUAL_VERIFY_ORIGIN || "http://localhost:3001",
    "http://localhost:3001",
  ),
  partnerId: String(process.env.VISUAL_PARTNER_ID || "hdfc_bank")
    .trim()
    .toLowerCase(),

  // ── Razorpay-style credentials ──────────────────────────────────
  keyId: String(process.env.VISUAL_KEY_ID || process.env.VISUAL_API_KEY || "").trim(),
  keySecret: String(process.env.VISUAL_KEY_SECRET || "").trim(),

  // Legacy
  apiKey: String(process.env.VISUAL_API_KEY || "").trim(),

  cookieSecret: String(
    process.env.COOKIE_SECRET || "test-site-cookie-secret-change-me",
  ).trim(),
  mongodbUri: process.env.MONGODB_URI || "",
};

/**
 * Build auth headers for the WallNet SaaS API.
 */
export const buildAuthHeaders = (): Record<string, string> => {
  const { keyId, keySecret, apiKey } = siteConfig;

  if (keyId && keySecret) {
    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    return { Authorization: `Basic ${credentials}` };
  }

  if (apiKey) {
    return { "x-api-key": apiKey };
  }

  if (keyId) {
    return { "x-api-key": keyId };
  }

  return {};
};
