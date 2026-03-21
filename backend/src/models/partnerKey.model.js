const { Schema, model } = require("mongoose");
const { randomUUID, randomBytes } = require("crypto");
const {
  decryptString,
  encryptString,
  hashDeterministic,
} = require("../utils/fieldEncryption");

const partnerKeySchema = new Schema(
  {
    partnerId: { type: String, required: true, trim: true, index: true },
    ownerUserId: { type: String, required: true, trim: true, index: true },
    label: { type: String, default: "", trim: true },
    apiKey: { type: String, default: "" },
    apiKeyEncrypted: { type: Schema.Types.Mixed, required: true },
    apiKeyHash: { type: String, required: true, unique: true, index: true },
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
 * Generate a new API key with the format: sk_{mode}_vps_{random}
 */
partnerKeySchema.statics.generateApiKey = function (mode = "test") {
  const prefix = mode === "live" ? "sk_live_vps_" : "sk_test_vps_";
  return `${prefix}${randomBytes(16).toString("hex")}`;
};

module.exports = model("PartnerKey", partnerKeySchema);
