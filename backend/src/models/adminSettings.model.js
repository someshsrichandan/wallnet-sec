const { Schema, model } = require("mongoose");
const { encryptString, decryptString } = require("../utils/fieldEncryption");

const adminSettingsSchema = new Schema(
  {
    // Singleton key — only one document should exist
    key: { type: String, default: "global", unique: true },

    // Trial settings
    trialDurationDays: { type: Number, default: 10, min: 1, max: 365 },
    trialEnabled: { type: Boolean, default: true },

    // Payment settings
    paymentAmount: { type: Number, default: 999, min: 0 },
    paymentCurrency: { type: String, default: "INR", trim: true },
    paymentMessage: {
      type: String,
      default:
        "Your trial has expired. Please subscribe to continue using the platform.",
      trim: true,
    },
    paymentLink: { type: String, default: "", trim: true },

    // API approval settings
    requireApiApproval: { type: Boolean, default: true },

    // Account settings
    autoActivateOnSignup: { type: Boolean, default: false },
    maxApiKeysPerUser: { type: Number, default: 20, min: 1, max: 100 },
    defaultApiLimit: { type: Number, default: 10000, min: 1 },

    // Notification messages
    deactivationMessage: {
      type: String,
      default:
        "Your account has been deactivated. Please contact support for assistance.",
      trim: true,
    },
    trialExpiredMessage: {
      type: String,
      default:
        "Your trial period has expired. Please upgrade to continue.",
      trim: true,
    },
    pendingApprovalMessage: {
      type: String,
      default:
        "Your API key is pending admin approval. You will be notified once approved.",
      trim: true,
    },

    // Global Announcements
    announcementText: { type: String, default: "", trim: true },
    announcementEnabled: { type: Boolean, default: false },

    // SMTP Configuration
    smtpHost: { type: String, default: "" },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String, default: "" },
    smtpPass: { 
      type: String, 
      default: "",
      set: (v) => encryptString(v),
      get: (v) => decryptString(v),
    },
    smtpFrom: { type: String, default: "WallNet-Sec <noreply@wallnet-sec.com>" },
    smtpService: { type: String, default: "custom" }, // 'gmail', 'outlook', 'custom', 'sendgrid', etc.
    smtpSecure: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

// Ensure only one settings document exists
adminSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ key: "global" });
  if (!settings) {
    settings = await this.create({ key: "global" });
  }
  return settings;
};

adminSettingsSchema.statics.updateSettings = async function (updates) {
  const settings = await this.findOneAndUpdate(
    { key: "global" },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );
  return settings;
};

module.exports = model("AdminSettings", adminSettingsSchema);
