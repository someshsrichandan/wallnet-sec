const DEFAULT_VISUAL_API_BASE = "http://localhost:3000/api";
const DEFAULT_VISUAL_VERIFY_ORIGIN = "http://localhost:3001";
const DEFAULT_DEMO_SHOP_ORIGIN = "http://localhost:3003";
const DEFAULT_PARTNER_ID = "shopmart";
const DEFAULT_PARTNER_API_KEY = "dev-partner-key-change-me";
const DEFAULT_COOKIE_SECRET = "change-demo-shop-cookie-secret";

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

export const demoShopConfig = {
    nodeEnv: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
    visualApiBase: String(
        process.env.VISUAL_BACKEND_API_BASE_URL || DEFAULT_VISUAL_API_BASE,
    ).replace(/\/+$/, ""),
    visualVerifyOrigin: normalizeOrigin(
        process.env.VISUAL_VERIFY_ORIGIN || DEFAULT_VISUAL_VERIFY_ORIGIN,
        DEFAULT_VISUAL_VERIFY_ORIGIN,
    ),
    publicOrigin: normalizeOrigin(
        process.env.DEMO_SHOP_PUBLIC_ORIGIN || DEFAULT_DEMO_SHOP_ORIGIN,
        DEFAULT_DEMO_SHOP_ORIGIN,
    ),
    partnerId: String(process.env.VISUAL_PARTNER_ID || DEFAULT_PARTNER_ID)
        .trim()
        .toLowerCase(),
    partnerApiKey: String(process.env.VISUAL_API_KEY || DEFAULT_PARTNER_API_KEY).trim(),
    visualAdminUrl:
        String(process.env.VISUAL_ADMIN_URL || "").trim() ||
        `${normalizeOrigin(
            process.env.VISUAL_VERIFY_ORIGIN || DEFAULT_VISUAL_VERIFY_ORIGIN,
            DEFAULT_VISUAL_VERIFY_ORIGIN,
        )}/admin`,
    cookieSecret: String(process.env.DEMO_SHOP_COOKIE_SECRET || DEFAULT_COOKIE_SECRET).trim(),
    shopSessionHours: toInt(process.env.DEMO_SHOP_SESSION_HOURS, 12),
    pendingSessionMinutes: toInt(process.env.DEMO_SHOP_PENDING_MINUTES, 10),
    mongodbUri: process.env.MONGODB_URI || "",
};

export const demoShopWarnings = (() => {
    const warnings: string[] = [];
    if (!demoShopConfig.isProduction) return warnings;
    if (demoShopConfig.partnerApiKey === DEFAULT_PARTNER_API_KEY)
        warnings.push(
            "VISUAL_API_KEY is using the insecure default. Set a real key in .env.local.",
        );
    if (demoShopConfig.cookieSecret === DEFAULT_COOKIE_SECRET)
        warnings.push(
            "DEMO_SHOP_COOKIE_SECRET is using the insecure default. Set a long random secret.",
        );
    return warnings;
})();
