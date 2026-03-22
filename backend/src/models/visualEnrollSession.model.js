const { Schema, model } = require("mongoose");

const ENROLL_SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

const visualEnrollSessionSchema = new Schema(
  {
    enrollToken: { type: String, required: true, unique: true, index: true },
    partnerId: { type: String, required: true, trim: true, index: true },
    userId: { type: String, required: true, trim: true, index: true },
    callbackUrl: { type: String, default: null },
    partnerState: { type: String, default: null },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "EXPIRED"],
      default: "PENDING",
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

visualEnrollSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

visualEnrollSessionSchema.statics.createSession = function ({
  partnerId,
  userId,
  callbackUrl,
  partnerState,
  ttlMs,
}) {
  const { randomUUID } = require("crypto");
  const resolvedTtlMs =
    Number.isFinite(ttlMs) && Number(ttlMs) > 0 ?
      Number(ttlMs)
    : ENROLL_SESSION_TTL_MS;
  const expiresAt = new Date(Date.now() + resolvedTtlMs);
  return this.create({
    enrollToken: randomUUID(),
    partnerId,
    userId,
    callbackUrl: callbackUrl || null,
    partnerState: partnerState || null,
    expiresAt,
  });
};

module.exports = model("VisualEnrollSession", visualEnrollSessionSchema);
