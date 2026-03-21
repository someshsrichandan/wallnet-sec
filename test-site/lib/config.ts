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
  apiKey: String(process.env.VISUAL_API_KEY || "").trim(),
  cookieSecret: String(
    process.env.COOKIE_SECRET || "test-site-cookie-secret-change-me",
  ).trim(),
  mongodbUri: process.env.MONGODB_URI || "",
};
