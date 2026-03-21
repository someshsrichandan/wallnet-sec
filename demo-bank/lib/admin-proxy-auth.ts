import { NextResponse } from "next/server";

const DEFAULT_PROXY_KEY = "dev-demo-bank-proxy-key-change-me";
const proxyKey = String(process.env.DEMO_BANK_PROXY_SHARED_KEY || DEFAULT_PROXY_KEY).trim();

export const getAdminOwnerFromProxyHeaders = (request: Request): string | null => {
  const providedProxyKey = String(request.headers.get("x-admin-proxy-key") || "").trim();
  const ownerUserId = String(request.headers.get("x-admin-owner-id") || "").trim();

  if (!providedProxyKey || providedProxyKey !== proxyKey) {
    return null;
  }

  if (!ownerUserId) {
    return null;
  }

  return ownerUserId;
};

export const getAdminPartnerIdsFromProxyHeaders = (request: Request): string[] => {
  const providedProxyKey = String(request.headers.get("x-admin-proxy-key") || "").trim();
  if (!providedProxyKey || providedProxyKey !== proxyKey) {
    return [];
  }

  const raw = String(request.headers.get("x-admin-partner-ids") || "").trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);
};

export const unauthorizedAdminProxy = () =>
  NextResponse.json(
    {
      ok: false,
      message: "Unauthorized admin proxy request.",
    },
    { status: 401 },
  );
