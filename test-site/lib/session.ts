import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { siteConfig } from "@/lib/config";
import type { SiteSession, PendingVisual } from "@/lib/types";

const SESSION_COOKIE = "sw_session";
const PENDING_COOKIE = "sw_pending";

const b64e = (v: string) => Buffer.from(v).toString("base64url");
const b64d = (v: string) => Buffer.from(v, "base64url").toString("utf8");

const sign = (encoded: string) =>
  createHmac("sha256", siteConfig.cookieSecret)
    .update(encoded)
    .digest("base64url");

const makeToken = <T extends object>(payload: T, ttlSec: number) => {
  const now = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: now + ttlSec };
  const encoded = b64e(JSON.stringify(full));
  return `${encoded}.${sign(encoded)}`;
};

const parseToken = <T extends object>(
  token: string | undefined | null,
): T | null => {
  if (!token || !token.includes(".")) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;

  const expected = sign(encoded);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(b64d(encoded)) as T & { exp?: number };
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) return null;
    const { iat: _, exp: __, ...rest } = parsed as Record<string, unknown>;
    return rest as T;
  } catch {
    return null;
  }
};

const setCookie = (
  res: NextResponse,
  name: string,
  value: string,
  maxAge: number,
) => {
  res.cookies.set({
    name,
    value,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
};

const clearCookie = (res: NextResponse, name: string) => {
  res.cookies.set({
    name,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
};

// ── Session ──
export const applySession = (res: NextResponse, session: SiteSession) => {
  const token = makeToken(session, 12 * 60 * 60);
  setCookie(res, SESSION_COOKIE, token, 12 * 60 * 60);
};

export const clearSession = (res: NextResponse) =>
  clearCookie(res, SESSION_COOKIE);

export const readSessionFromRequest = (req: NextRequest) => {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return parseToken<SiteSession>(token);
};

export const readServerSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return parseToken<SiteSession>(token);
};

// ── Pending Visual Login ──
export const applyPending = (res: NextResponse, pending: PendingVisual) => {
  const token = makeToken(pending, 10 * 60);
  setCookie(res, PENDING_COOKIE, token, 10 * 60);
};

export const clearPending = (res: NextResponse) =>
  clearCookie(res, PENDING_COOKIE);

export const readPendingFromRequest = (req: NextRequest) => {
  const token = req.cookies.get(PENDING_COOKIE)?.value;
  return parseToken<PendingVisual>(token);
};
