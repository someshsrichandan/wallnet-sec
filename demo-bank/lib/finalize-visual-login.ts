import { NextResponse, type NextRequest } from "next/server";

import { findUserById, updateUserVisualEnabled } from "@/lib/demo-bank-store";
import {
  applyBankSession,
  clearBankSession,
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

const buildMismatch = () => "Callback mismatch. Start login again.";

const normalizeResult = (value: string) => String(value || "").trim().toUpperCase();

const isMismatch = (left: string, right: string) =>
  Boolean(left) && Boolean(right) && left.trim().toLowerCase() !== right.trim().toLowerCase();

const createFailureResponse = (
  request: NextRequest,
  message: string,
  opts: { redirect: boolean; statusCode?: number }
) => {
  const statusCode = opts.statusCode || 400;
  if (opts.redirect) {
    const url = new URL(`/login?error=${toSafeError(message)}`, request.url);
    const response = NextResponse.redirect(url);
    clearPendingVisual(response);
    clearBankSession(response);
    return response;
  }

  const response = NextResponse.json({ ok: false, message }, { status: statusCode });
  clearPendingVisual(response);
  clearBankSession(response);
  return response;
};

const createSuccessResponse = (request: NextRequest, input: { redirect: boolean; userId: string }) => {
  if (input.redirect) {
    const url = new URL("/dashboard?verified=1", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.json({ ok: true, userId: input.userId });
};

export const finalizeVisualLogin = async (
  request: NextRequest,
  payload: FinalizeInput,
  options: { redirect: boolean }
) => {
  const pending = readPendingVisualFromRequest(request);
  if (!pending) {
    return createFailureResponse(request, "No pending visual login found.", {
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
    return createFailureResponse(request, buildMismatch(), {
      redirect: options.redirect,
      statusCode: 401,
    });
  }

  const callbackResult = normalizeResult(payload.result);
  if (callbackResult !== "PASS" || !payload.signature) {
    const reason =
      callbackResult && callbackResult !== "PASS"
        ? `Visual verification ${callbackResult.toLowerCase()}.`
        : "Visual verification failed.";
    return createFailureResponse(request, reason, {
      redirect: options.redirect,
      statusCode: 401,
    });
  }

  let consumed;
  try {
    consumed = await consumeVisualResult(payload.signature);
  } catch (error) {
    if (error instanceof VisualApiError) {
      return createFailureResponse(request, error.message, {
        redirect: options.redirect,
        statusCode: error.statusCode,
      });
    }
    return createFailureResponse(request, "Unable to validate visual signature.", {
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
    return createFailureResponse(request, buildMismatch(), {
      redirect: options.redirect,
      statusCode: 401,
    });
  }

  const localUser = await findUserById(pending.userId);
  if (!localUser) {
    return createFailureResponse(request, "Local bank account not found.", {
      redirect: options.redirect,
      statusCode: 404,
    });
  }

  // Auto-sync visualEnabled flag — if they just proved visual auth, they must be enrolled.
  if (!localUser.visualEnabled) {
    await updateUserVisualEnabled(localUser.id, true).catch(() => undefined);
  }

  const response = createSuccessResponse(request, { redirect: options.redirect, userId: localUser.id });
  applyBankSession(response, {
    userId: localUser.id,
    partnerUserId: localUser.partnerUserId,
    email: localUser.email,
    fullName: localUser.fullName,
  });
  clearPendingVisual(response);
  return response;
};
