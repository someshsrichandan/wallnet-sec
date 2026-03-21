import { Schema, model, models } from "mongoose";

import { connectDB } from "@/lib/db";
import type { DemoBankUser, VisualProfile } from "@/lib/types";

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
    ownerUserId:    { type: String, required: false, default: "", index: true },
    partnerId:      { type: String, required: false, default: "", index: true },
    partnerUserId:  { type: String, required: true, unique: true, index: true },
    fullName:       { type: String, required: true },
    email:          { type: String, required: true, unique: true, index: true },
    passwordHash:   { type: String, required: true },
    phone:          { type: String, required: false, default: "" },
    accountNumber:  { type: String, required: false, default: "", index: true },
    visualEnabled:  { type: Boolean, required: true, default: false },
    visualProfile:  { type: visualProfileSchema, required: false },
    createdAt:      { type: String, required: true },
    updatedAt:      { type: String, required: true },
  },
  { collection: "users", versionKey: false },
);

function getModel(): any {
  const existing = models["DemoBankUser"] as any;
  if (existing) {
    const ownerPath = existing.schema.path("ownerUserId") as
      | { isRequired?: boolean | (() => boolean) }
      | undefined;
    const partnerPath = existing.schema.path("partnerId") as
      | { isRequired?: boolean | (() => boolean) }
      | undefined;

    const ownerIsRequired =
      typeof ownerPath?.isRequired === "function"
        ? ownerPath.isRequired()
        : Boolean(ownerPath?.isRequired);
    const partnerIsRequired =
      typeof partnerPath?.isRequired === "function"
        ? partnerPath.isRequired()
        : Boolean(partnerPath?.isRequired);

    if (ownerIsRequired || partnerIsRequired) {
      delete models["DemoBankUser"];
      return model("DemoBankUser", userSchema) as any;
    }

    return existing;
  }

  return model("DemoBankUser", userSchema) as any;
}

function clean(doc: Record<string, unknown>): DemoBankUser {
  const { _id, ...rest } = doc;
  void _id;
  return rest as unknown as DemoBankUser;
}

//  Public API 

export const listUsers = async (): Promise<DemoBankUser[]> => {
  await connectDB();
  const docs = await getModel().find().lean() as Record<string, unknown>[];
  return docs.map(clean);
};

export const findUserByEmail = async (email: string): Promise<DemoBankUser | null> => {
  await connectDB();
  const doc = await getModel()
    .findOne({ email: email.toLowerCase().trim() })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserById = async (id: string): Promise<DemoBankUser | null> => {
  await connectDB();
  const doc = await getModel().findOne({ id }).lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserByPartnerUserId = async (
  partnerUserId: string,
): Promise<DemoBankUser | null> => {
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
  ownerUserId: string;
  partnerId: string;
  phone?: string;
  accountNumber?: string;
  visualProfile?: VisualProfile;
}): Promise<DemoBankUser> => {
  await connectDB();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const created = await getModel().create({
    id,
    ownerUserId: input.ownerUserId,
    partnerId: input.partnerId,
    partnerUserId: input.partnerUserId,
    fullName:      input.fullName,
    email:         input.email.toLowerCase().trim(),
    passwordHash:  input.passwordHash,
    phone:         input.phone || "",
    accountNumber: input.accountNumber || "",
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
): Promise<DemoBankUser> => {
  await connectDB();
  const doc = await getModel()
    .findOneAndUpdate(
      { id },
      { $set: { visualEnabled, updatedAt: new Date().toISOString() } },
      { new: true },
    )
    .lean() as Record<string, unknown> | null;
  if (!doc) throw new Error(`DemoBankUser ${id} not found`);
  return clean(doc);
};

export const findUserByAccountNumber = async (accountNumber: string): Promise<DemoBankUser | null> => {
  await connectDB();
  const doc = await getModel()
    .findOne({ accountNumber: accountNumber.trim() })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const listUsersByOwner = async (ownerUserId: string): Promise<DemoBankUser[]> => {
  await connectDB();
  const docs = await getModel()
    .find({ ownerUserId: String(ownerUserId || "").trim() })
    .lean() as Record<string, unknown>[];
  return docs.map(clean);
};

export const listUsersWithoutOwner = async (): Promise<DemoBankUser[]> => {
  await connectDB();
  const docs = await getModel()
    .find({
      $or: [{ ownerUserId: { $exists: false } }, { ownerUserId: "" }],
    })
    .lean() as Record<string, unknown>[];
  return docs.map(clean);
};

export const listLegacyUsersByPartnerIds = async (
  partnerIds: string[],
): Promise<DemoBankUser[]> => {
  const ids = partnerIds.map((id) => String(id || "").trim().toLowerCase()).filter(Boolean);
  if (ids.length === 0) return [];

  await connectDB();
  const docs = await getModel()
    .find({
      partnerId: { $in: ids },
      $or: [{ ownerUserId: { $exists: false } }, { ownerUserId: "" }],
    })
    .lean() as Record<string, unknown>[];
  return docs.map(clean);
};

export const findUserByAccountNumberForOwner = async (
  accountNumber: string,
  ownerUserId: string,
): Promise<DemoBankUser | null> => {
  await connectDB();
  const doc = await getModel()
    .findOne({
      accountNumber: accountNumber.trim(),
      ownerUserId: String(ownerUserId || "").trim(),
    })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserByPartnerUserIdForOwner = async (
  partnerUserId: string,
  ownerUserId: string,
): Promise<DemoBankUser | null> => {
  await connectDB();
  const doc = await getModel()
    .findOne({
      partnerUserId: partnerUserId.trim(),
      ownerUserId: String(ownerUserId || "").trim(),
    })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserByEmailForOwner = async (
  email: string,
  ownerUserId: string,
): Promise<DemoBankUser | null> => {
  await connectDB();
  const doc = await getModel()
    .findOne({
      email: email.toLowerCase().trim(),
      ownerUserId: String(ownerUserId || "").trim(),
    })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserByAccountNumberWithoutOwner = async (
  accountNumber: string,
): Promise<DemoBankUser | null> => {
  await connectDB();
  const doc = await getModel()
    .findOne({
      accountNumber: accountNumber.trim(),
      $or: [{ ownerUserId: { $exists: false } }, { ownerUserId: "" }],
    })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserByPartnerUserIdWithoutOwner = async (
  partnerUserId: string,
): Promise<DemoBankUser | null> => {
  await connectDB();
  const doc = await getModel()
    .findOne({
      partnerUserId: partnerUserId.trim(),
      $or: [{ ownerUserId: { $exists: false } }, { ownerUserId: "" }],
    })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserByEmailWithoutOwner = async (
  email: string,
): Promise<DemoBankUser | null> => {
  await connectDB();
  const doc = await getModel()
    .findOne({
      email: email.toLowerCase().trim(),
      $or: [{ ownerUserId: { $exists: false } }, { ownerUserId: "" }],
    })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserByAccountNumberForPartnerIdsWithoutOwner = async (
  accountNumber: string,
  partnerIds: string[],
): Promise<DemoBankUser | null> => {
  const ids = partnerIds.map((id) => String(id || "").trim().toLowerCase()).filter(Boolean);
  if (ids.length === 0) return null;

  await connectDB();
  const doc = await getModel()
    .findOne({
      accountNumber: accountNumber.trim(),
      partnerId: { $in: ids },
      $or: [{ ownerUserId: { $exists: false } }, { ownerUserId: "" }],
    })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserByPartnerUserIdForPartnerIdsWithoutOwner = async (
  partnerUserId: string,
  partnerIds: string[],
): Promise<DemoBankUser | null> => {
  const ids = partnerIds.map((id) => String(id || "").trim().toLowerCase()).filter(Boolean);
  if (ids.length === 0) return null;

  await connectDB();
  const doc = await getModel()
    .findOne({
      partnerUserId: partnerUserId.trim(),
      partnerId: { $in: ids },
      $or: [{ ownerUserId: { $exists: false } }, { ownerUserId: "" }],
    })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const findUserByEmailForPartnerIdsWithoutOwner = async (
  email: string,
  partnerIds: string[],
): Promise<DemoBankUser | null> => {
  const ids = partnerIds.map((id) => String(id || "").trim().toLowerCase()).filter(Boolean);
  if (ids.length === 0) return null;

  await connectDB();
  const doc = await getModel()
    .findOne({
      email: email.toLowerCase().trim(),
      partnerId: { $in: ids },
      $or: [{ ownerUserId: { $exists: false } }, { ownerUserId: "" }],
    })
    .lean() as Record<string, unknown> | null;
  return doc ? clean(doc) : null;
};

export const getAllUsers = async (): Promise<DemoBankUser[]> => {
  await connectDB();
  const docs = await getModel()
    .find({})
    .sort({ createdAt: -1 })
    .lean() as Record<string, unknown>[];
  return docs.map(clean);
};

