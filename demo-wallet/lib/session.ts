import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

import { demoWalletConfig } from "@/lib/config";
import type { DemoWalletSession, PendingVisualLogin } from "@/lib/types";

const SESSION_COOKIE = "demo_wallet_session";
const PENDING_COOKIE = "demo_wallet_pending";

type SignedPayload<T> = T & {
  iat: number;
  exp: number;
};

const stripTokenMeta = <T extends object>(payload: SignedPayload<T>): T => {
  const clone = { ...payload } as Record<string, unknown>;
  delete clone.iat;
  delete clone.exp;
  return clone as T;
};

const base64UrlEncode = (value: string) => Buffer.from(value).toString("base64url");
const base64UrlDecode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const signValue = (encodedPayload: string) =>
  createHmac("sha256", demoWalletConfig.cookieSecret).update(encodedPayload).digest("base64url");

const createSignedToken = <T extends object>(payload: T, ttlSec: number) => {
  const now = Math.floor(Date.now() / 1000);
  const full: SignedPayload<T> = {
    ...payload,
    iat: now,
    exp: now + ttlSec,
  };
  const encoded = base64UrlEncode(JSON.stringify(full));
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
};

const parseSignedToken = <T extends object>(
  token: string | undefined | null,
): SignedPayload<T> | null => {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = signValue(encoded);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as SignedPayload<T>;
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

const secure = demoWalletConfig.isProduction;
const sessionMaxAgeSec = demoWalletConfig.walletSessionHours * 60 * 60;
const pendingMaxAgeSec = demoWalletConfig.pendingSessionMinutes * 60;

const setCookie = (response: NextResponse, name: string, value: string, maxAgeSec: number) => {
  response.cookies.set({
    name,
    value,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  });
};

const clearCookie = (response: NextResponse, name: string) => {
  response.cookies.set({
    name,
    value: "",
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
};

export const applyWalletSession = (response: NextResponse, session: DemoWalletSession) => {
  const token = createSignedToken<DemoWalletSession>(session, sessionMaxAgeSec);
  setCookie(response, SESSION_COOKIE, token, sessionMaxAgeSec);
};

export const clearWalletSession = (response: NextResponse) => {
  clearCookie(response, SESSION_COOKIE);
};

export const readWalletSessionFromRequest = (request: NextRequest) => {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = parseSignedToken<DemoWalletSession>(token);
  if (!payload) {
    return null;
  }
  return stripTokenMeta<DemoWalletSession>(payload);
};

export const parseWalletSessionToken = (token: string | undefined | null) => {
  const payload = parseSignedToken<DemoWalletSession>(token);
  if (!payload) {
    return null;
  }
  return stripTokenMeta<DemoWalletSession>(payload);
};

export const applyPendingVisual = (response: NextResponse, pending: PendingVisualLogin) => {
  const token = createSignedToken<PendingVisualLogin>(pending, pendingMaxAgeSec);
  setCookie(response, PENDING_COOKIE, token, pendingMaxAgeSec);
};

export const clearPendingVisual = (response: NextResponse) => {
  clearCookie(response, PENDING_COOKIE);
};

export const readPendingVisualFromRequest = (request: NextRequest) => {
  const token = request.cookies.get(PENDING_COOKIE)?.value;
  const payload = parseSignedToken<PendingVisualLogin>(token);
  if (!payload) {
    return null;
  }
  return stripTokenMeta<PendingVisualLogin>(payload);
};
