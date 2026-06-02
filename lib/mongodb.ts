import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI || '';
const MAIN_DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

// NOTE: do NOT throw at module-import time for a missing URI. Importing this
// module during `next build` (page-data collection) would then hard-fail the
// whole build in any environment without env vars (e.g. Netlify/Vercel deploy
// previews). Defer the check to connectDB() so it only errors when a DB
// connection is actually attempted at runtime.

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached = (global as any).mongoose as CachedConnection;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI_MAIN (or MONGODB_URI) environment variable');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: MAIN_DB_NAME,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
