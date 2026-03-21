const { Schema, model } = require("mongoose");

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
    callbackUrl: { type: String, default: "", trim: true },
    partnerState: { type: String, default: "", trim: true },
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
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: "secretLetters must contain exactly 2 items",
      },
    },
    selectedSecretVegetable: { type: String, required: true, trim: true },
    fruitSelectionVerifiedAt: { type: Date, default: null },
    selectedSecretNumber: { type: Number, required: true },
    saltValue: { type: Number, required: true, default: 5 },
    expectedDigitOne: { type: String, required: true },
    expectedDigitTwo: { type: String, required: true },
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
    verificationSignature: { type: String, default: "" },
    consumedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

visualSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model("VisualSession", visualSessionSchema);
