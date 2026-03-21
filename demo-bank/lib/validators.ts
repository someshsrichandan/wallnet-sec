const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const normalizePartnerUserId = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const parseRegisterPayload = (value: unknown) => {
  const body = (value || {}) as Record<string, unknown>;
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "");
  const partnerUserId = normalizePartnerUserId(body.partnerUserId);

  assert(fullName.length >= 2, "fullName must be at least 2 characters");
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "email is invalid");
  assert(password.length >= 8, "password must be at least 8 characters");

  if (partnerUserId) {
    assert(
      partnerUserId.length >= 4 && partnerUserId.length <= 80,
      "partnerUserId must be between 4 and 80 characters"
    );
  }

  return {
    fullName,
    email,
    password,
    partnerUserId,
  };
};
