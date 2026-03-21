/**
 * In-memory OTP store for agent verification flow.
 * Each OTP is scoped to a unique requestId (userId+timestamp hash).
 * TTL: 5 minutes.
 */

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

type OtpRecord = {
  otp: string;
  userId: string;
  email: string;
  fullName: string;
  expiresAt: number;
  verified: boolean;
};

// Global in-memory store (persists across requests within same process)
const otpStore = new Map<string, OtpRecord>();

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (record.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}, 60_000);

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const storeOtp = (requestId: string, record: Omit<OtpRecord, "expiresAt" | "verified">) => {
  otpStore.set(requestId, {
    ...record,
    expiresAt: Date.now() + OTP_TTL_MS,
    verified: false,
  });
};

export const verifyOtp = (requestId: string, submittedOtp: string): {
  valid: boolean;
  record?: OtpRecord;
  reason?: string;
} => {
  const record = otpStore.get(requestId);
  if (!record) {
    return { valid: false, reason: "OTP request not found or expired." };
  }
  if (record.expiresAt < Date.now()) {
    otpStore.delete(requestId);
    return { valid: false, reason: "OTP has expired. Please send a new one." };
  }
  if (record.verified) {
    return { valid: false, reason: "OTP already used." };
  }
  if (record.otp !== submittedOtp.trim()) {
    return { valid: false, reason: "Incorrect OTP." };
  }

  // Mark as verified but keep for 60s so the agent can send the re-enroll link
  record.verified = true;
  record.expiresAt = Date.now() + 60_000;
  return { valid: true, record };
};

export const getVerifiedRecord = (requestId: string): OtpRecord | null => {
  const record = otpStore.get(requestId);
  if (!record || !record.verified || record.expiresAt < Date.now()) return null;
  return record;
};

export const clearOtp = (requestId: string) => {
  otpStore.delete(requestId);
};
