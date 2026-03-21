const {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} = require("crypto");

const env = require("../config/env");

const ENCRYPTION_PREFIX = "enc:v1";
const ALGORITHM = "aes-256-gcm";

const deriveKey = (raw) =>
  createHash("sha256")
    .update(String(raw || ""))
    .digest();

/**
 * Builds the ordered list of candidate decryption keys.
 *
 * Key priority for ENCRYPTION (first key is authoritative):
 *   1. VISUAL_DATA_ENCRYPTION_KEY  (preferred)
 *   2. TOKEN_SECRET                (fallback)
 *   3. empty string                (legacy: no key was set at enrollment time)
 *
 * For DECRYPTION we try ALL of these in order until one succeeds.
 * This makes the system resilient to key rotation — old credentials
 * encrypted with a previous key (or no key) can still be read.
 */
const deriveKeys = () => {
  const preferred = String(env.visualDataEncryptionKey || "").trim();
  const fallback  = String(env.tokenSecret || "").trim();

  // Always include the zero-key so credentials enrolled before any env
  // vars were set can still be decrypted after the first reconfiguration.
  const candidates = [preferred, fallback, ""];        // "" = deriveKey("")
  const unique = [...new Set(candidates)];             // dedup while preserving order

  return unique.map((item) => deriveKey(item));
};

const encodePart = (value) => Buffer.from(value).toString("base64url");
const decodePart = (value) => Buffer.from(String(value || ""), "base64url");

const encryptString = (plaintext) => {
  if (plaintext === null || plaintext === undefined) {
    return plaintext;
  }

  const input = String(plaintext);
  if (input.startsWith(`${ENCRYPTION_PREFIX}:`)) {
    return input;
  }

  // Always encrypt with the primary (first) key.
  const iv = randomBytes(12);
  const [primaryKey] = deriveKeys();
  const cipher = createCipheriv(ALGORITHM, primaryKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(input, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX,
    encodePart(iv),
    encodePart(authTag),
    encodePart(ciphertext),
  ].join(":");
};

const decryptString = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  if (!value.startsWith(`${ENCRYPTION_PREFIX}:`)) {
    // Not an encrypted token — return as-is (plain stored value).
    return value;
  }

  // Format: "enc:v1:<iv>:<tag>:<ciphertext>"  → 5 colon-separated tokens.
  // We must skip BOTH "enc" and "v1" (indices 0 and 1).
  const [, , ivPart, tagPart, cipherPart] = value.split(":");
  if (!ivPart || !tagPart || !cipherPart) {
    return "";
  }

  // Try every candidate key in order — first hit wins.
  for (const key of deriveKeys()) {
    try {
      const decipher = createDecipheriv(ALGORITHM, key, decodePart(ivPart));
      decipher.setAuthTag(decodePart(tagPart));
      const plaintext = Buffer.concat([
        decipher.update(decodePart(cipherPart)),
        decipher.final(),
      ]);
      return plaintext.toString("utf8");
    } catch {
      // Wrong key or corrupt ciphertext — try the next candidate.
    }
  }

  // No key matched.
  return "";
};

const encryptJson = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  return encryptString(JSON.stringify(value));
};

const decryptJson = (value, fallback) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== "string") {
    // Already a plain JS value (e.g. Array stored without encryption).
    return value;
  }

  const decrypted = decryptString(value);
  if (decrypted === "") {
    return fallback;
  }

  try {
    return JSON.parse(decrypted);
  } catch {
    return fallback;
  }
};

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const hashDeterministic = (value) => {
  const [primaryKey] = deriveKeys();
  const key = primaryKey;
  return createHmac("sha256", key).update(String(value || "")).digest("hex");
};

const hashEmailForLookup = (email) => hashDeterministic(normalizeEmail(email));

module.exports = {
  decryptJson,
  decryptString,
  encryptJson,
  encryptString,
  hashDeterministic,
  hashEmailForLookup,
  normalizeEmail,
};
