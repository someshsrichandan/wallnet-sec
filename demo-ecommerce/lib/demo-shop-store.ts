import { Schema, model, models } from "mongoose";

import { connectDB } from "@/lib/db";
import type { DemoShopUser, VisualProfile } from "@/lib/types";

//  Mongoose schema 

const visualProfileSchema = new Schema(
  {
    catalogType:      { type: String, required: true },
    secretVegetables: [String],
    secretLetters:    [String],
    formulaMode:      { type: String, required: true },
    alphabetMode:     { type: String, required: true },
    saltValue:        { type: Number, required: true },
    positionPair:     [Number],
  } satisfies Record<keyof VisualProfile, unknown>,
  { _id: false },
);

const userSchema = new Schema(
  {
    id:             { type: String, required: true, unique: true, index: true },
    partnerUserId:  { type: String, required: true, unique: true, index: true },
    fullName:       { type: String, required: true },
    email:          { type: String, required: true, unique: true, index: true },
    passwordHash:   { type: String, required: true },
    visualEnabled:  { type: Boolean, required: true, default: false },
    visualProfile:  { type: visualProfileSchema, required: false },
    createdAt:      { type: String, required: true },
    updatedAt:      { type: String, required: true },
  },
  { collection: "users", versionKey: false },
);

function getModel() {
  return models["DemoShopUser"] ?? model("DemoShopUser", userSchema);
}

function clean(doc: Record<string, unknown>): DemoShopUser {
  const { _id, ...rest } = doc;
  void _id;
  return rest as unknown as DemoShopUser;
}

//  Public API 

export const listUsers = async (): Promise<DemoShopUser[]> => {
  await connectDB();
  const docs = await getModel().find().lean() as Record<string, unknown>[];
  return docs.map(clean);
};

export const findUserByEmail = async (email: string): Promise<DemoShopUser | null> => {
  await connectDB();
  const doc = await getModel()
    .findOne({ email: email.toLowerCase().trim() })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserById = async (id: string): Promise<DemoShopUser | null> => {
  await connectDB();
  const doc = await getModel().findOne({ id }).lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserByPartnerUserId = async (
  partnerUserId: string,
): Promise<DemoShopUser | null> => {
  await connectDB();
  const doc = await getModel()
    .findOne({ partnerUserId })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const createUser = async (input: {
  email: string;
  fullName: string;
  passwordHash: string;
  partnerUserId: string;
  visualProfile?: VisualProfile;
}): Promise<DemoShopUser> => {
  await connectDB();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const created = await getModel().create({
    id,
    partnerUserId: input.partnerUserId,
    fullName:      input.fullName,
    email:         input.email.toLowerCase().trim(),
    passwordHash:  input.passwordHash,
    visualEnabled: false,
    visualProfile: input.visualProfile ?? undefined,
    createdAt:     now,
    updatedAt:     now,
  });
  const raw = created.toObject() as Record<string, unknown>;
  return clean(raw);
};

export const updateUserVisualEnabled = async (
  id: string,
  visualEnabled: boolean,
): Promise<DemoShopUser> => {
  await connectDB();
  const doc = await getModel()
    .findOneAndUpdate(
      { id },
      { $set: { visualEnabled, updatedAt: new Date().toISOString() } },
      { new: true },
    )
    .lean() as Record<string, unknown> | null;
  if (!doc) throw new Error(`DemoShopUser ${id} not found`);
  return clean(doc);
};
