const { Schema, model } = require('mongoose');
const {
  decryptJson,
  decryptString,
  encryptJson,
  encryptString,
} = require('../utils/fieldEncryption');

const visualCredentialSchema = new Schema(
  {
    ownerUserId: { type: String, required: true, trim: true, index: true },
    partnerId: { type: String, required: true, trim: true, index: true },
    userId: { type: String, required: true, trim: true, index: true },
    catalogType: {
      type: Schema.Types.Mixed,
      required: true,
      default: 'VEGETABLE',
      set: (value) => encryptString(String(value || 'VEGETABLE').trim().toUpperCase()),
      get: (value) => decryptString(value),
    },
    secretVegetables: {
      type: Schema.Types.Mixed,
      required: true,
      set: (value) => encryptJson(value),
      get: (value) => {
        const decoded = decryptJson(value, []);
        return Array.isArray(decoded) ? decoded : [];
      },
    },
    pairVegetables: {
      type: Schema.Types.Mixed,
      default: [],
      set: (value) => encryptJson(value),
      get: (value) => {
        const decoded = decryptJson(value, []);
        return Array.isArray(decoded) ? decoded : [];
      },
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
    saltValue: {
      type: Schema.Types.Mixed,
      required: true,
      default: 5,
      set: (value) => encryptJson(value),
      get: (value) => {
        const decoded = decryptJson(value, 5);
        return typeof decoded === 'number' ? decoded : Number(decoded || 5);
      },
    },
    formulaMode: {
      type: Schema.Types.Mixed,
      required: true,
      default: 'SALT_ADD',
      set: (value) => encryptString(String(value || 'SALT_ADD').trim().toUpperCase()),
      get: (value) => decryptString(value),
    },
    alphabetMode: {
      type: Schema.Types.Mixed,
      required: true,
      default: 'SEQUENTIAL',
      set: (value) => encryptString(String(value || 'SEQUENTIAL').trim().toUpperCase()),
      get: (value) => decryptString(value),
    },
    positionPair: {
      type: [Number],
      default: [],
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.length <= 2 &&
          new Set(value).size === value.length &&
          value.every((item) => Number.isInteger(item) && item >= 1 && item <= 18),
        message: 'positionPair must contain up to 2 unique positions between 1 and 18',
      },
    },
    active: { type: Boolean, default: true },
    suspiciousAttemptCount: { type: Number, default: 0 },
    lastSuspiciousAt: { type: Date, default: null },
    knownFingerprints: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

visualCredentialSchema.index({ partnerId: 1, userId: 1 }, { unique: true });

module.exports = model('VisualCredential', visualCredentialSchema);
