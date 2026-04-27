const { Schema, model } = require("mongoose");
const { randomBytes } = require("crypto");
const bcrypt = require("bcrypt");
const {
  decryptString,
  encryptString,
  hashDeterministic,
} = require("../utils/fieldEncryption");

const BCRYPT_ROUNDS = 10;

const partnerKeySchema = new Schema(
  {
    partnerId: { type: String, required: true, trim: true, index: true },
    ownerUserId: { type: String, required: true, trim: true, index: true },
    label: { type: String, default: "", trim: true },

    // Razorpay-style key_id + key_secret
    keyId: { type: String, required: true, unique: true, index: true },
    keySecretHash: { type: String, required: true },
    webhookSecret: { 
      type: Schema.Types.Mixed, 
      default: "",
      set: (value) => encryptString(value),
      get: (value) => decryptString(value),
    },

    // Legacy/fallback storage for x-api-key compatibility
    apiKey: { type: String, default: "", index: true, sparse: true },
    apiKeyEncrypted: { type: Schema.Types.Mixed, default: "" },
    apiKeyHash: { type: String, default: "", unique: true, sparse: true },
    apiKeyPreview: { type: String, default: "", trim: true },
    mode: {
      type: String,
      enum: ["test", "live"],
      default: "test",
      index: true,
    },
    webhookUrl: { type: String, default: "", trim: true },
    callbackAllowlist: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "", trim: true },
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
  this.apiKeyHash = apiKey ? hashDeterministic(apiKey) : "";
  this.apiKeyPreview = apiKey ? apiKey.slice(-8) : "";
};

partnerKeySchema.methods.getApiKey = function () {
  if (this.apiKeyEncrypted) {
    return decryptString(this.apiKeyEncrypted);
  }
  return String(this.apiKey || "");
};

partnerKeySchema.statics.generateKeyPair = async function (mode = "test") {
  const modeTag = mode === "live" ? "live" : "test";

  const keyId = `key_${modeTag}_vps_${randomBytes(12).toString("hex")}`;
  const keySecret = `secret_${modeTag}_vps_${randomBytes(32).toString("hex")}`;
  const webhookSecret = `whsec_${randomBytes(32).toString("hex")}`;

  const keySecretHash = await bcrypt.hash(keySecret, BCRYPT_ROUNDS);

  return { keyId, keySecret, keySecretHash, webhookSecret };
};

partnerKeySchema.methods.verifySecret = async function (plainSecret) {
  if (!this.keySecretHash) return false;
  return bcrypt.compare(plainSecret, this.keySecretHash);
};

partnerKeySchema.methods.rotateSecret = async function () {
  const modeTag = this.mode === "live" ? "live" : "test";
  const newSecret = `secret_${modeTag}_vps_${randomBytes(32).toString("hex")}`;
  this.keySecretHash = await bcrypt.hash(newSecret, BCRYPT_ROUNDS);
  return newSecret;
};

partnerKeySchema.statics.generateApiKey = function (mode = "test") {
  const prefix = mode === "live" ? "sk_live_vps_" : "sk_test_vps_";
  return `${prefix}${randomBytes(16).toString("hex")}`;
};

module.exports = model("PartnerKey", partnerKeySchema);
