import { Schema, model, models } from "mongoose";

import { connectDB } from "@/lib/db";
import type { WalletUser } from "@/lib/types";

//  Mongoose schema 

const userSchema = new Schema(
  {
    id:            { type: String, required: true, unique: true, index: true },
    partnerUserId: { type: String, required: true, unique: true, index: true },
    fullName:      { type: String, required: true },
    email:         { type: String, required: true, unique: true, index: true },
    passwordHash:  { type: String, required: true },
    visualEnabled: { type: Boolean, required: true, default: false },
    createdAt:     { type: String, required: true },
    updatedAt:     { type: String, required: true },
  },
  { collection: "users", versionKey: false },
);

function getModel() {
  return models["WalletUser"] ?? model("WalletUser", userSchema);
}

function clean(doc: Record<string, unknown>): WalletUser {
  const { _id, ...rest } = doc;
  void _id;
  return rest as unknown as WalletUser;
}

//  Public API 

export const listUsers = async (): Promise<WalletUser[]> => {
  await connectDB();
  const docs = await getModel().find().lean() as Record<string, unknown>[];
  return docs.map(clean);
};

export const findUserByEmail = async (email: string): Promise<WalletUser | null> => {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;
  await connectDB();
  const doc = await getModel()
    .findOne({ email: normalized })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserById = async (id: string): Promise<WalletUser | null> => {
  const uid = String(id || "").trim();
  if (!uid) return null;
  await connectDB();
  const doc = await getModel().findOne({ id: uid }).lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserByPartnerUserId = async (
  partnerUserId: string,
): Promise<WalletUser | null> => {
  const normalized = String(partnerUserId || "").trim().toLowerCase();
  if (!normalized) return null;
  await connectDB();
  const doc = await getModel()
    .findOne({ partnerUserId: normalized })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const createUser = async (input: {
  email: string;
  fullName: string;
  passwordHash: string;
  partnerUserId: string;
}): Promise<WalletUser> => {
  const email = String(input.email || "").trim().toLowerCase();
  const fullName = String(input.fullName || "").trim();
  const partnerUserId = String(input.partnerUserId || "").trim().toLowerCase();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await connectDB();

  const existing = await getModel().findOne({ $or: [{ email }, { partnerUserId }] }).lean();
  if (existing) {
    const e = existing as Record<string, unknown>;
    if (e["email"] === email) throw new Error("A user with this email already exists");
    throw new Error("A user with this partner user id already exists");
  }

  const created = await getModel().create({
    id,
    partnerUserId,
    email,
    fullName,
    passwordHash: input.passwordHash,
    visualEnabled: false,
    createdAt: now,
    updatedAt: now,
  });
  const raw = created.toObject() as Record<string, unknown>;
  return clean(raw);
};

export const updateUserVisualEnabled = async (
  id: string,
  enabled: boolean,
): Promise<WalletUser> => {
  await connectDB();
  const doc = await getModel()
    .findOneAndUpdate(
      { id },
      { $set: { visualEnabled: enabled, updatedAt: new Date().toISOString() } },
      { new: true },
    )
    .lean() as Record<string, unknown> | null;
  if (!doc) throw new Error("User not found");
  return clean(doc);
};
