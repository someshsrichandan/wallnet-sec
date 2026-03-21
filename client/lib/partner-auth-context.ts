export type PendingPartnerAuthContext = {
  sessionToken: string;
  partnerId: string;
  userId: string;
  state: string;
  mode: "redirect" | "popup";
  environment: "live" | "test";
  apiKey?: string;
  createdAt: number;
};

const PENDING_PARTNER_AUTH_KEY = "pendingPartnerAuthContext";

const isBrowser = () => typeof window !== "undefined";

export const readPendingPartnerAuthContext = (): PendingPartnerAuthContext | null => {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(PENDING_PARTNER_AUTH_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingPartnerAuthContext>;
    if (!parsed?.sessionToken || !parsed?.partnerId || !parsed?.userId) {
      window.sessionStorage.removeItem(PENDING_PARTNER_AUTH_KEY);
      return null;
    }
    return {
      sessionToken: parsed.sessionToken,
      partnerId: parsed.partnerId,
      userId: parsed.userId,
      state: parsed.state || "",
      mode: parsed.mode === "popup" ? "popup" : "redirect",
      environment: parsed.environment === "test" ? "test" : "live",
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
    };
  } catch {
    window.sessionStorage.removeItem(PENDING_PARTNER_AUTH_KEY);
    return null;
  }
};

export const writePendingPartnerAuthContext = (context: PendingPartnerAuthContext) => {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem(PENDING_PARTNER_AUTH_KEY, JSON.stringify(context));
};

export const clearPendingPartnerAuthContext = () => {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(PENDING_PARTNER_AUTH_KEY);
};

export const createSecureState = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`.slice(0, 24);
};
