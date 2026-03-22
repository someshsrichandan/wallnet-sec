const { Schema, model } = require("mongoose");
const {
  decryptJson,
  decryptString,
  encryptJson,
  encryptString,
} = require("../utils/fieldEncryption");

const visualSessionSchema = new Schema(
  {
    // Back-compat: older DBs may have a unique index on sessionId.
    // Keep it populated to avoid duplicate key errors on { sessionId: null }.
    sessionId: { type: String, required: true, unique: true, index: true },
    sessionToken: { type: String, required: true, unique: true, index: true },
    partnerId: { type: String, required: true, trim: true, index: true },
    userId: { type: String, required: true, trim: true, index: true },
    catalogType: {
      type: String,
      enum: ["VEGETABLE", "CRICKETER", "BOLLYWOOD"],
      default: "VEGETABLE",
      index: true,
    },
    ownerUserId: { type: String, required: true, trim: true, index: true },
    authKeyDocId: { type: String, default: "", trim: true, index: true },
    authKeyId: { type: String, default: "", trim: true, index: true },
    authMethod: { type: String, default: "", trim: true, index: true },
    sourceHost: { type: String, default: "", trim: true, index: true },
    callbackUrl: {
      type: Schema.Types.Mixed,
      default: "",
      set: (value) => encryptString(String(value || "").trim()),
      get: (value) => decryptString(value),
    },
    partnerState: {
      type: Schema.Types.Mixed,
      default: "",
      set: (value) => encryptString(String(value || "").trim()),
      get: (value) => decryptString(value),
    },
    vegetables: {
      type: [
        {
          name: { type: String, required: true },
          number: { type: Number, required: true },
          imageUrl: { type: String, default: "" },
        },
      ],
      default: [],
    },
    alphabetGrid: {
      type: [String],
      default: [],
    },
    secretLetters: {
      type: Schema.Types.Mixed,
      required: true,
      set: (value) => encryptJson(value),
      get: (value) => {
        const decoded = decryptJson(value, []);
        return Array.isArray(decoded) ? decoded : [];
      },
    },
    selectedSecretVegetable: {
      type: Schema.Types.Mixed,
      required: true,
      set: (value) => encryptString(value),
      get: (value) => decryptString(value),
    },
    fruitSelectionVerifiedAt: { type: Date, default: null },
    selectedSecretNumber: {
      type: Schema.Types.Mixed,
      required: true,
      set: (value) => encryptJson(value),
      get: (value) => {
        const decoded = decryptJson(value, null);
        return typeof decoded === "number" ? decoded : Number(decoded || 0);
      },
    },
    saltValue: { type: Number, required: true, default: 5 },
    expectedDigitOne: {
      type: Schema.Types.Mixed,
      required: true,
      set: (value) => encryptString(value),
      get: (value) => decryptString(value),
    },
    expectedDigitTwo: {
      type: Schema.Types.Mixed,
      required: true,
      set: (value) => encryptString(value),
      get: (value) => decryptString(value),
    },
    formulaMode: {
      type: String,
      enum: ["SALT_ADD", "POSITION_SUM", "PAIR_SUM"],
      default: "SALT_ADD",
      index: true,
    },
    formulaHint: {
      type: Schema.Types.Mixed,
      default: {},
    },
    requestFingerprint: { type: String, default: "", index: true },
    status: {
      type: String,
      enum: ["PENDING", "PASS", "FAIL", "LOCKED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
    maxAttempts: { type: Number, required: true, default: 3 },
    attemptCount: { type: Number, default: 0 },
    honeypotDetected: { type: Boolean, default: false },
    csrfNonce: { type: String, default: "" },
    verificationSignature: {
      type: Schema.Types.Mixed,
      default: "",
      set: (value) => encryptString(String(value || "")),
      get: (value) => decryptString(value),
    },
    consumedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null },
    aiShadowSnapshot: {
      type: Schema.Types.Mixed,
      default: null,
    },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

visualSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model("VisualSession", visualSessionSchema);
