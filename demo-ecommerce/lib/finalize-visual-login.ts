import { NextResponse, type NextRequest } from "next/server";

import { findUserById, updateUserVisualEnabled } from "@/lib/demo-shop-store";
import {
    applyShopSession,
    clearShopSession,
    clearPendingVisual,
    readPendingVisualFromRequest,
} from "@/lib/session";
import { consumeVisualResult, VisualApiError } from "@/lib/visual-api";

type FinalizeInput = {
    result: string;
    signature: string;
    state: string;
    sessionToken: string;
    partnerId: string;
    userId: string;
};

const toSafeError = (message: string) => encodeURIComponent(message.slice(0, 160));
const isMismatch = (left: string, right: string) =>
    Boolean(left) && Boolean(right) && left.trim().toLowerCase() !== right.trim().toLowerCase();

const fail = (
    request: NextRequest,
    message: string,
    opts: { redirect: boolean; statusCode?: number },
) => {
    if (opts.redirect) {
        const response = NextResponse.redirect(
            new URL(`/login?error=${toSafeError(message)}`, request.url),
        );
        clearPendingVisual(response);
        clearShopSession(response);
        return response;
    }
    const response = NextResponse.json({ ok: false, message }, { status: opts.statusCode || 400 });
    clearPendingVisual(response);
    clearShopSession(response);
    return response;
};

export const finalizeVisualLogin = async (
    request: NextRequest,
    payload: FinalizeInput,
    options: { redirect: boolean },
) => {
    const pending = readPendingVisualFromRequest(request);
    if (!pending)
        return fail(request, "No pending visual login found.", {
            redirect: options.redirect,
            statusCode: 401,
        });

    if (
        isMismatch(payload.state, pending.state) ||
        isMismatch(payload.sessionToken, pending.sessionToken) ||
        isMismatch(payload.userId, pending.partnerUserId) ||
        isMismatch(payload.partnerId, pending.partnerId)
    ) {
        return fail(request, "Callback mismatch. Start login again.", {
            redirect: options.redirect,
            statusCode: 401,
        });
    }

    const callbackResult = String(payload.result || "")
        .trim()
        .toUpperCase();
    if (callbackResult !== "PASS" || !payload.signature) {
        const reason =
            callbackResult && callbackResult !== "PASS"
                ? `Visual verification ${callbackResult.toLowerCase()}.`
                : "Visual verification failed.";
        return fail(request, reason, { redirect: options.redirect, statusCode: 401 });
    }

    let consumed;
    try {
        consumed = await consumeVisualResult(payload.signature);
    } catch (error) {
        if (error instanceof VisualApiError) {
            return fail(request, error.message, {
                redirect: options.redirect,
                statusCode: error.statusCode,
            });
        }
        return fail(request, "Unable to validate visual signature.", {
            redirect: options.redirect,
            statusCode: 503,
        });
    }

    if (
        isMismatch(consumed.sessionToken, pending.sessionToken) ||
        isMismatch(consumed.partnerId, pending.partnerId) ||
        isMismatch(consumed.userId, pending.partnerUserId) ||
        isMismatch(consumed.state, pending.state)
    ) {
        return fail(request, "Callback mismatch. Start login again.", {
            redirect: options.redirect,
            statusCode: 401,
        });
    }

    const localUser = await findUserById(pending.userId);
    if (!localUser) {
        return fail(request, "Local shop account not found.", {
            redirect: options.redirect,
            statusCode: 404,
        });
    }

    if (!localUser.visualEnabled) {
        await updateUserVisualEnabled(localUser.id, true).catch(() => undefined);
    }

    const session = {
        userId: localUser.id,
        partnerUserId: localUser.partnerUserId,
        email: localUser.email,
        fullName: localUser.fullName,
    };

    if (options.redirect) {
        const response = NextResponse.redirect(new URL("/dashboard?verified=1", request.url));
        applyShopSession(response, session);
        clearPendingVisual(response);
        return response;
    }

    const response = NextResponse.json({ ok: true, userId: localUser.id });
    applyShopSession(response, session);
    clearPendingVisual(response);
    return response;
};
