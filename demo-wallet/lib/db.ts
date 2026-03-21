import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;
const DB_NAME = "demo-wallet";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const cache: MongooseCache = { conn: null, promise: null };

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      bufferCommands: false,
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
