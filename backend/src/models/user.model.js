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
    name: { type: String, required: true, trim: true },
    email: {
      type: Schema.Types.Mixed,
      required: true,
      set: (value) => encryptString(normalizeEmail(value)),
      get: (value) => decryptString(value),
    },
    emailHash: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

userSchema.pre("validate", function (next) {
  const normalizedEmail = normalizeEmail(this.email);
  this.emailHash = hashEmailForLookup(normalizedEmail);
  next();
});

module.exports = model("User", userSchema);
