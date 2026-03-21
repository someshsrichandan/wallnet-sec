const { Schema, model } = require("mongoose");
const { decryptString, encryptString } = require("../utils/fieldEncryption");

const aiAgentSettingsSchema = new Schema(
  {
    ownerUserId: { type: String, required: true, trim: true, index: true },
    partnerId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    providerName: { type: String, default: "custom", trim: true },
    agentBaseUrl: { type: String, default: "", trim: true },
    findUserPath: { type: String, default: "/api/demo-bank/agent/find-user", trim: true },
    sendOtpPath: { type: String, default: "/api/demo-bank/agent/send-otp", trim: true },
    verifyOtpPath: { type: String, default: "/api/demo-bank/agent/verify-otp", trim: true },
    adminResetPath: { type: String, default: "/api/demo-bank/agent/admin-reset", trim: true },
    webhookUrl: { type: String, default: "", trim: true },
    callbackBaseUrl: { type: String, default: "", trim: true },
    inputSchemaUrl: { type: String, default: "", trim: true },
    authType: {
      type: String,
      enum: ["NONE", "API_KEY", "BEARER"],
      default: "NONE",
      index: true,
    },
    outboundSecret: {
      type: Schema.Types.Mixed,
      default: "",
      set: (value) => encryptString(String(value || "")),
      get: (value) => decryptString(value),
    },
    customHeaders: {
      type: [String],
      default: [],
    },
    supportedLanguages: {
      type: [String],
      default: ["nodejs", "java", "php", "golang", "aspnet"],
    },
    enableAutoResetEmail: { type: Boolean, default: true },
    enableAdminReset: { type: Boolean, default: true },
    enabled: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

aiAgentSettingsSchema.index({ ownerUserId: 1, partnerId: 1 });

module.exports = model("AiAgentSettings", aiAgentSettingsSchema);
