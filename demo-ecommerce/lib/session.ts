import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

import { demoShopConfig } from "@/lib/config";
import type { DemoShopSession, PendingVisualLogin } from "@/lib/types";

const SESSION_COOKIE = "demo_shop_session";
const PENDING_COOKIE = "demo_shop_pending";

type SignedPayload<T> = T & { iat: number; exp: number };

const base64UrlEncode = (value: string) => Buffer.from(value).toString("base64url");
const base64UrlDecode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const signValue = (encodedPayload: string) =>
    createHmac("sha256", demoShopConfig.cookieSecret).update(encodedPayload).digest("base64url");

const createSignedToken = <T extends object>(payload: T, ttlSec: number) => {
    const now = Math.floor(Date.now() / 1000);
    const full: SignedPayload<T> = { ...payload, iat: now, exp: now + ttlSec };
    const encoded = base64UrlEncode(JSON.stringify(full));
    return `${encoded}.${signValue(encoded)}`;
};

const parseSignedToken = <T extends object>(
    token: string | undefined | null,
): SignedPayload<T> | null => {
    if (!token || typeof token !== "string" || !token.includes(".")) return null;
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;
    const expectedSignature = signValue(encoded);
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (providedBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;
    try {
        const payload = JSON.parse(base64UrlDecode(encoded)) as SignedPayload<T>;
        const now = Math.floor(Date.now() / 1000);
        if (!payload.exp || payload.exp < now) return null;
        return payload;
    } catch {
        return null;
    }
};

const secure = demoShopConfig.isProduction;
const sessionMaxAgeSec = demoShopConfig.shopSessionHours * 60 * 60;
const pendingMaxAgeSec = demoShopConfig.pendingSessionMinutes * 60;

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

export const applyShopSession = (response: NextResponse, session: DemoShopSession) => {
    const token = createSignedToken<DemoShopSession>(session, sessionMaxAgeSec);
    setCookie(response, SESSION_COOKIE, token, sessionMaxAgeSec);
    return response;
};

export const clearShopSession = (response: NextResponse) => {
    clearCookie(response, SESSION_COOKIE);
    return response;
};

export const applyPendingVisual = (response: NextResponse, pending: PendingVisualLogin) => {
    const token = createSignedToken<PendingVisualLogin>(pending, pendingMaxAgeSec);
    setCookie(response, PENDING_COOKIE, token, pendingMaxAgeSec);
    return response;
};

export const clearPendingVisual = (response: NextResponse) => {
    clearCookie(response, PENDING_COOKIE);
    return response;
};

export const readBankSessionFromRequest = (request: NextRequest): DemoShopSession | null => {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const parsed = parseSignedToken<DemoShopSession>(token);
    if (!parsed) return null;
    const { iat: _iat, exp: _exp, ...session } = parsed;
    return session as DemoShopSession;
};

export const readPendingVisualFromRequest = (request: NextRequest): PendingVisualLogin | null => {
    const token = request.cookies.get(PENDING_COOKIE)?.value;
    const parsed = parseSignedToken<PendingVisualLogin>(token);
    if (!parsed) return null;
    const { iat: _iat, exp: _exp, ...pending } = parsed;
    return pending as PendingVisualLogin;
};

export const parseShopSessionToken = (token: string | undefined | null): DemoShopSession | null => {
    const parsed = parseSignedToken<DemoShopSession>(token);
    if (!parsed) return null;
    const { iat: _iat, exp: _exp, ...session } = parsed;
    return session as DemoShopSession;
};
