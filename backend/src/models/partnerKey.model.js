const { Schema, model } = require("mongoose");
const { randomUUID, randomBytes } = require("crypto");

const partnerKeySchema = new Schema(
  {
    partnerId: { type: String, required: true, trim: true, index: true },
    ownerUserId: { type: String, required: true, trim: true, index: true },
    label: { type: String, default: "", trim: true },
    apiKey: { type: String, required: true, unique: true, index: true },
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

/**
 * Generate a new API key with the format: sk_{mode}_vps_{random}
 */
partnerKeySchema.statics.generateApiKey = function (mode = "test") {
  const prefix = mode === "live" ? "sk_live_vps_" : "sk_test_vps_";
  return `${prefix}${randomBytes(16).toString("hex")}`;
};

module.exports = model("PartnerKey", partnerKeySchema);
