const { Schema, model } = require("mongoose");
const {
  decryptString,
  encryptString,
  encryptJson,
  decryptJson,
} = require("../utils/fieldEncryption");

const auditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "ENROLL",
        "ENROLL_UPDATE",
        "INIT_AUTH",
        "CHALLENGE_LOADED",
        "VERIFY_PASS",
        "VERIFY_FAIL",
        "SESSION_LOCKED",
        "SESSION_EXPIRED",
        "HONEYPOT_DETECTED",
        "CONSUME_RESULT",
        "INIT_ENROLL",
        "ENROLL_SESSION_SUBMIT",
        "DEVICE_TRUST_LOW",
        "GEO_VELOCITY_FLAG",
        "BEHAVIORAL_ANOMALY",
        "WEBHOOK_SENT",
        "WEBHOOK_FAILED",
        "API_KEY_GENERATED",
        "API_KEY_ROTATED",
        "API_KEY_REVOKED",
        "AI_FRAUD_ASSESSMENT",
        "USER_SIGNUP",
        "USER_LOGIN_SUCCESS",
        "USER_LOGIN_FAILURE",
      ],
      index: true,
    },
    severity: {
      type: String,
      enum: ["INFO", "WARN", "CRITICAL"],
      default: "INFO",
      index: true,
    },
    partnerId: { type: String, default: "", trim: true, index: true },
    ownerUserId: { type: String, default: "", trim: true, index: true },
    userId: { type: String, default: "", trim: true, index: true },
    sessionToken: { type: String, default: "", trim: true, index: true },
    ip: { 
      type: Schema.Types.Mixed, 
      default: "",
      set: (v) => encryptString(v),
      get: (v) => decryptString(v)
    },
    userAgent: { type: String, default: "" },
    requestId: { type: String, default: "" },
    fingerprint: { type: String, default: "" },
    geo: {
      country: { type: String, default: "" },
      city: { type: String, default: "" },
      lat: { type: Number, default: 0 },
      lon: { type: Number, default: 0 },
    },
    metadata: { 
      type: Schema.Types.Mixed, 
      default: {},
      set: (v) => encryptJson(v),
      get: (v) => decryptJson(v, {})
    },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ partnerId: 1, createdAt: -1 });
auditLogSchema.index({ ownerUserId: 1, createdAt: -1 });

// Auto-expire after 90 days
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

module.exports = model("AuditLog", auditLogSchema);
