import { buildAuthHeaders, demoBankConfig } from "@/lib/config";

type OwnerResolveResult = {
  ownerUserId: string;
  keyId: string;
  partnerId: string;
};

let cached: { value: OwnerResolveResult; expiresAt: number } | null = null;

const OWNER_CACHE_MS = 60_000;

/**
 * Resolves the owner user id for the configured partner credentials.
 * This lets demo-bank persist tenant ownership for newly registered users.
 */
export const resolvePartnerOwner = async (): Promise<OwnerResolveResult> => {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const headers = {
    ...buildAuthHeaders(),
    "content-type": "application/json",
  };

  const res = await fetch(
    `${demoBankConfig.visualApiBase}/partners/test-credentials?partnerId=${encodeURIComponent(demoBankConfig.partnerId)}`,
    {
    method: "GET",
    headers,
    cache: "no-store",
    },
  );

  const payload = (await res.json().catch(() => ({}))) as {
    ownerUserId?: string;
    key_id?: string;
    partnerId?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(payload.message || "Unable to resolve API key owner");
  }

  const value = {
    ownerUserId: String(payload.ownerUserId || "").trim(),
    keyId: String(payload.key_id || "").trim(),
    partnerId: String(payload.partnerId || demoBankConfig.partnerId || "").trim().toLowerCase(),
  };

  cached = {
    value,
    expiresAt: now + OWNER_CACHE_MS,
  };

  return value;
};
