import { Schema, model, models } from "mongoose";

import { connectDB } from "@/lib/db";
import type { DemoWalletUser, VisualProfile } from "@/lib/types";

// Mongoose schema

const visualProfileSchema = new Schema(
  {
    catalogType: { type: String, required: true },
    secretVegetables: [String],
    secretLetters: [String],
    formulaMode: { type: String, required: true },
    alphabetMode: { type: String, required: true },
    saltValue: { type: Number, required: true },
    positionPair: [Number],
  } satisfies Record<keyof VisualProfile, unknown>,
  { _id: false },
);

const userSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    partnerUserId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, index: true },
    passwordHash: { type: String, required: true },
    visualEnabled: { type: Boolean, required: true, default: false },
    visualProfile: { type: visualProfileSchema, required: false },
    walletBalance: { type: Number, required: true, default: 0 },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { collection: "wallet_users", versionKey: false },
);

function getModel() {
  return models["DemoWalletUser"] ?? model("DemoWalletUser", userSchema);
}

function clean(doc: Record<string, unknown>): DemoWalletUser {
  const { _id, ...rest } = doc;
  void _id;
  return rest as unknown as DemoWalletUser;
}

// Public API

export const listUsers = async (): Promise<DemoWalletUser[]> => {
  await connectDB();
  const docs = (await getModel().find().lean()) as Record<string, unknown>[];
  return docs.map(clean);
};

export const findUserByEmail = async (email: string): Promise<DemoWalletUser | null> => {
  await connectDB();
  const doc = (await getModel()
    .findOne({ email: email.toLowerCase().trim() })
    .lean()) as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserByPhone = async (phone: string): Promise<DemoWalletUser | null> => {
  await connectDB();
  const doc = (await getModel()
    .findOne({ phone: phone.trim() })
    .lean()) as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserById = async (id: string): Promise<DemoWalletUser | null> => {
  await connectDB();
  const doc = (await getModel().findOne({ id }).lean()) as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserByPartnerUserId = async (
  partnerUserId: string,
): Promise<DemoWalletUser | null> => {
  await connectDB();
  const doc = (await getModel()
    .findOne({ partnerUserId })
    .lean()) as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const createUser = async (input: {
  email: string;
  phone: string;
  fullName: string;
  passwordHash: string;
  partnerUserId: string;
  visualProfile?: VisualProfile;
}): Promise<DemoWalletUser> => {
  await connectDB();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const created = await getModel().create({
    id,
    partnerUserId: input.partnerUserId,
    fullName: input.fullName,
    email: input.email.toLowerCase().trim(),
    phone: input.phone.trim(),
    passwordHash: input.passwordHash,
    visualEnabled: false,
    visualProfile: input.visualProfile ?? undefined,
    walletBalance: 10000, // ₹10,000 welcome bonus
    createdAt: now,
    updatedAt: now,
  });
  const raw = created.toObject() as Record<string, unknown>;
  return clean(raw);
};

export const updateUserVisualEnabled = async (
  id: string,
  visualEnabled: boolean,
): Promise<DemoWalletUser> => {
  await connectDB();
  const doc = (await getModel()
    .findOneAndUpdate(
      { id },
      { $set: { visualEnabled, updatedAt: new Date().toISOString() } },
      { new: true },
    )
    .lean()) as Record<string, unknown> | null;
  if (!doc) throw new Error(`DemoWalletUser ${id} not found`);
  return clean(doc);
};
