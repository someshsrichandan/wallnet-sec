const { Schema, model } = require("mongoose");
const { decryptString, encryptString } = require("../utils/fieldEncryption");

const emailSettingsSchema = new Schema(
  {
    ownerUserId: { type: String, required: true, trim: true, index: true },
    partnerId: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    emailHost: { type: String, required: true, trim: true },
    emailPort: { type: Number, required: true, default: 587 },
    emailUser: { type: String, required: true, trim: true },
    emailPass: {
      type: Schema.Types.Mixed,
      required: true,
      set: (value) => encryptString(String(value || "")),
      get: (value) => decryptString(value),
    },
    emailTo: { type: String, default: "", trim: true },
    fromName: { type: String, default: "Visual Security", trim: true },
    enabled: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

emailSettingsSchema.index({ ownerUserId: 1, partnerId: 1 });

module.exports = model("EmailSettings", emailSettingsSchema);
