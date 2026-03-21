const { Schema, model } = require("mongoose");
const { randomUUID } = require("crypto");

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
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

module.exports = model("User", userSchema);
