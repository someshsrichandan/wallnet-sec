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
        // ── Core auth / session ──────────────────
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
        // ── Webhooks ──────────────────────────────
        "WEBHOOK_SENT",
        "WEBHOOK_FAILED",
        // ── API keys (partner) ────────────────────
        "API_KEY_GENERATED",
        "API_KEY_ROTATED",
        "API_KEY_REVOKED",
        // ── AI / fraud ────────────────────────────
        "AI_FRAUD_ASSESSMENT",
        // ── User / partner account ────────────────
        "USER_SIGNUP",
        "USER_LOGIN_SUCCESS",
        "USER_LOGIN_FAILURE",
        // ── Super-admin actions ───────────────────
        "SUPER_ADMIN_LOGIN_SUCCESS",
        "SUPER_ADMIN_LOGIN_FAILURE",
        "SUPER_ADMIN_ACTIVATE_PARTNER",
        "SUPER_ADMIN_DEACTIVATE_PARTNER",
        "SUPER_ADMIN_SUSPEND_PARTNER",
        "SUPER_ADMIN_APPROVE_API_KEY",
        "SUPER_ADMIN_REJECT_API_KEY",
        "SUPER_ADMIN_DELETE_PARTNER",
        "SUPER_ADMIN_RESET_PARTNER_PASSWORD",
        "SUPER_ADMIN_IMPERSONATE_PARTNER",
        "SUPER_ADMIN_UPDATE_SETTINGS",
        // ── Admin partner management ──────────────
        "ADMIN_PARTNER_ACCOUNT_UPDATE",
        "ADMIN_PARTNER_EMAIL_SENT",
        "ADMIN_PARTNER_NOTE_ADDED",
      ],
      index: true,
    },
    severity: {
      type: String,
      enum: ["INFO", "WARN", "CRITICAL"],
      default: "INFO",
      index: true,
    },
    // logId is kept as a sparse optional field to avoid duplicate-key errors from
    // legacy MongoDB indexes that may still exist on older collections.
    logId: { type: String, default: null, sparse: true },
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
