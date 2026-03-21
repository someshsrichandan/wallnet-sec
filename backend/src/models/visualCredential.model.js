const { Schema, model } = require('mongoose');

const visualCredentialSchema = new Schema(
  {
    ownerUserId: { type: String, required: true, trim: true, index: true },
    partnerId: { type: String, required: true, trim: true, index: true },
    userId: { type: String, required: true, trim: true, index: true },
    catalogType: {
      type: String,
      enum: ['VEGETABLE', 'CRICKETER', 'BOLLYWOOD'],
      default: 'VEGETABLE',
      index: true,
    },
    secretVegetables: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 4,
        message: 'secretVegetables must contain exactly 4 items',
      },
    },
    pairVegetables: {
      type: [String],
      default: [],
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.length <= 2 &&
          new Set(value).size === value.length &&
          value.every((item) => typeof item === 'string' && item.trim().length > 0),
        message: 'pairVegetables must contain up to 2 unique items',
      },
    },
    secretLetters: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: 'secretLetters must contain exactly 2 items',
      },
    },
    saltValue: { type: Number, required: true, default: 5 },
    formulaMode: {
      type: String,
      enum: ['SALT_ADD', 'POSITION_SUM', 'PAIR_SUM'],
      default: 'SALT_ADD',
    },
    alphabetMode: {
      type: String,
      enum: ['SEQUENTIAL', 'RANDOM'],
      default: 'SEQUENTIAL',
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
  { timestamps: true }
);

visualCredentialSchema.index({ partnerId: 1, userId: 1 }, { unique: true });

module.exports = model('VisualCredential', visualCredentialSchema);
