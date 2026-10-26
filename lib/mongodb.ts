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
  // STRICT RULE: MongoDB is completely decommissioned. Swar Yoga strictly uses Bunny Database.
  return null;
}

export default connectDB;
