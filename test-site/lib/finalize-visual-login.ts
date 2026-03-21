import { NextResponse, type NextRequest } from "next/server";

import { findUserById, updateUserVisualEnabled } from "@/lib/store";
import {
  applySession,
  clearSession,
  clearPending,
  readPendingFromRequest,
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

const toSafeError = (msg: string) => encodeURIComponent(msg.slice(0, 160));

const isMismatch = (a: string, b: string) =>
  Boolean(a) && Boolean(b) && a.trim().toLowerCase() !== b.trim().toLowerCase();

const normalizeResult = (v: string) =>
  String(v || "")
    .trim()
    .toUpperCase();

const fail = (
  req: NextRequest,
  message: string,
  opts: { redirect: boolean; statusCode?: number },
) => {
  const sc = opts.statusCode || 400;
  if (opts.redirect) {
    const url = new URL(`/login?error=${toSafeError(message)}`, req.url);
    const res = NextResponse.redirect(url);
    clearPending(res);
    clearSession(res);
    return res;
  }
  const res = NextResponse.json({ ok: false, message }, { status: sc });
  clearPending(res);
  clearSession(res);
  return res;
};

const ok = (req: NextRequest, opts: { redirect: boolean; userId: string }) => {
  if (opts.redirect) {
    return NextResponse.redirect(new URL("/dashboard?verified=1", req.url));
  }
  return NextResponse.json({ ok: true, userId: opts.userId });
};

export const finalizeVisualLogin = async (
  request: NextRequest,
  payload: FinalizeInput,
  options: { redirect: boolean },
) => {
  const pending = readPendingFromRequest(request);
  if (!pending) {
    return fail(request, "No pending visual login found.", {
      redirect: options.redirect,
      statusCode: 401,
    });
  }

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

  const callbackResult = normalizeResult(payload.result);
  if (callbackResult !== "PASS" || !payload.signature) {
    const reason =
      callbackResult && callbackResult !== "PASS" ?
        `Visual verification ${callbackResult.toLowerCase()}.`
      : "Visual verification failed.";
    return fail(request, reason, {
      redirect: options.redirect,
      statusCode: 401,
    });
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
    return fail(request, "Local account not found.", {
      redirect: options.redirect,
      statusCode: 404,
    });
  }

  if (!localUser.visualEnabled) {
    await updateUserVisualEnabled(localUser.id, true).catch(() => undefined);
  }

  const response = ok(request, {
    redirect: options.redirect,
    userId: localUser.id,
  });
  applySession(response, {
    userId: localUser.id,
    partnerUserId: localUser.partnerUserId,
    email: localUser.email,
    fullName: localUser.fullName,
  });
  clearPending(response);
  return response;
};
