const { Schema, model } = require("mongoose");
const { randomUUID } = require("crypto");
const {
  decryptString,
  encryptString,
  hashEmailForLookup,
  normalizeEmail,
} = require("../utils/fieldEncryption");

const userSchema = new Schema(
  {
    userId: {
      type: String,
      unique: true,
      trim: true,
      default: () => randomUUID(),
    },
    partnerId: {
      type: String,
      trim: true,
      default: "local",
    },
    externalUserId: {
      type: String,
      trim: true,
      default: () => randomUUID(),
    },
    name: { 
      type: Schema.Types.Mixed, 
      required: true, 
      trim: true,
      set: (value) => encryptString(value),
      get: (value) => decryptString(value),
    },
    email: {
      type: Schema.Types.Mixed,
      required: true,
      set: (value) => encryptString(normalizeEmail(value)),
      get: (value) => decryptString(value),
    },
    emailHash: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },

    // Account status: active, inactive, trial, suspended
    status: {
      type: String,
      enum: ["active", "inactive", "trial", "suspended"],
      default: "trial",
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    trialStartDate: { type: Date, default: Date.now },
    trialExpiresAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    deactivatedAt: { type: Date, default: null },
    deactivatedReason: { type: String, default: "", trim: true },
    
    // API Quotas
    apiLimit: { type: Number, default: 10000 },
    apiUsage: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

userSchema.pre("validate", function () {
  const normalizedEmail = normalizeEmail(this.email);
  this.emailHash = hashEmailForLookup(normalizedEmail);
});

module.exports = model("User", userSchema);
