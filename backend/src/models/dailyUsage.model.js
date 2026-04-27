const { Schema, model } = require("mongoose");

const dailyUsageSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    partnerId: { type: String, required: true },
    date: { type: Date, required: true }, // Normalized to start of day
    count: { type: Number, default: 0 },
    keyUsage: [
      {
        keyId: { type: String },
        count: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

// Index for efficient querying by partner and date
dailyUsageSchema.index({ ownerUserId: 1, date: 1 }, { unique: true });

module.exports = model("DailyUsage", dailyUsageSchema);
