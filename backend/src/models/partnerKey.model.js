const { Schema, model } = require("mongoose");
<<<<<<< HEAD
const { randomBytes } = require("crypto");
const bcrypt = require("bcrypt");

const BCRYPT_ROUNDS = 10;
=======
const { randomUUID, randomBytes } = require("crypto");
const {
  decryptString,
  encryptString,
  hashDeterministic,
} = require("../utils/fieldEncryption");
>>>>>>> 62388dadf3d8d8ec21b053b424e5fc17b2b98703

const partnerKeySchema = new Schema(
  {
    partnerId: { type: String, required: true, trim: true, index: true },
    ownerUserId: { type: String, required: true, trim: true, index: true },
    label: { type: String, default: "", trim: true },
<<<<<<< HEAD

    // ── Razorpay-style key_id + key_secret ──────────────────────────
    // keyId is the public identifier (always visible, used in Basic auth)
    keyId: { type: String, required: true, unique: true, index: true },

    // keySecretHash stores the bcrypt hash of the secret (never exposed after creation)
    keySecretHash: { type: String, required: true },

    // webhookSecret is used to sign webhook payloads (HMAC-SHA256)
    webhookSecret: { type: String, default: "" },

    // Legacy field — kept for backward compat with env-based keys
    // New DB-generated keys do NOT use this field
    apiKey: { type: String, default: "", index: true, sparse: true },

=======
    apiKey: { type: String, default: "" },
    apiKeyEncrypted: { type: Schema.Types.Mixed, required: true },
    apiKeyHash: { type: String, required: true, unique: true, index: true },
    apiKeyPreview: { type: String, default: "", trim: true },
>>>>>>> 62388dadf3d8d8ec21b053b424e5fc17b2b98703
    mode: {
      type: String,
      enum: ["test", "live"],
      default: "test",
      index: true,
    },
    webhookUrl: { type: String, default: "", trim: true },
    callbackAllowlist: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
    lastUsedAt: { type: Date, default: null },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

partnerKeySchema.index({ partnerId: 1, mode: 1 });
partnerKeySchema.index({ ownerUserId: 1, partnerId: 1 });

partnerKeySchema.methods.setApiKey = function (apiKeyValue) {
  const apiKey = String(apiKeyValue || "").trim();
  this.apiKey = "";
  this.apiKeyEncrypted = encryptString(apiKey);
  this.apiKeyHash = hashDeterministic(apiKey);
  this.apiKeyPreview = apiKey ? apiKey.slice(-8) : "";
};

partnerKeySchema.methods.getApiKey = function () {
  if (this.apiKeyEncrypted) {
    return decryptString(this.apiKeyEncrypted);
  }
  return String(this.apiKey || "");
};

/**
 * Generate a Razorpay-style key pair.
 *
 * Returns: { keyId, keySecret, keySecretHash, webhookSecret }
 *
 *   keyId      – public, e.g. "key_test_vps_a1b2c3d4e5f6"
 *   keySecret  – private, shown once: "secret_test_vps_..."  (32 hex bytes)
 *   webhookSecret – used to sign webhooks: "whsec_..."       (32 hex bytes)
 */
partnerKeySchema.statics.generateKeyPair = async function (mode = "test") {
  const modeTag = mode === "live" ? "live" : "test";

  const keyId = `key_${modeTag}_vps_${randomBytes(12).toString("hex")}`;
  const keySecret = `secret_${modeTag}_vps_${randomBytes(32).toString("hex")}`;
  const webhookSecret = `whsec_${randomBytes(32).toString("hex")}`;

  const keySecretHash = await bcrypt.hash(keySecret, BCRYPT_ROUNDS);

  return { keyId, keySecret, keySecretHash, webhookSecret };
};

/**
 * Verify a plaintext key secret against the stored hash.
 */
partnerKeySchema.methods.verifySecret = async function (plainSecret) {
  if (!this.keySecretHash) return false;
  return bcrypt.compare(plainSecret, this.keySecretHash);
};

/**
 * Rotate the key secret — generates a new secret + hash.
 * Returns the new plaintext secret (one-time visible).
 */
partnerKeySchema.methods.rotateSecret = async function () {
  const modeTag = this.mode === "live" ? "live" : "test";
  const newSecret = `secret_${modeTag}_vps_${randomBytes(32).toString("hex")}`;
  this.keySecretHash = await bcrypt.hash(newSecret, BCRYPT_ROUNDS);
  return newSecret;
};

// ── Legacy helper (kept for backward compat with env-based keys) ──
partnerKeySchema.statics.generateApiKey = function (mode = "test") {
  const prefix = mode === "live" ? "sk_live_vps_" : "sk_test_vps_";
  return `${prefix}${randomBytes(16).toString("hex")}`;
};

module.exports = model("PartnerKey", partnerKeySchema);
