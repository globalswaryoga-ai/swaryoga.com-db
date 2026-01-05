#!/usr/bin/env node

/**
 * Count and list admin users (safe fields only).
 *
 * This script NEVER prints passwords or tokens.
 *
 * Usage:
 *   node scripts/count-admin-users.js
 *
 * It reads DB settings from environment:
 *   - MONGODB_URI_MAIN (preferred) or MONGODB_URI
 *   - MONGODB_MAIN_DB_NAME (optional; defaults to swaryogaDB)
 */

const mongoose = require('mongoose');

function normalizeMongoUri(raw) {
  if (!raw) return '';
  return String(raw).trim().replace(/^"|"$/g, '').replace(/\n/g, '');
}

async function main() {
  const uri = normalizeMongoUri(process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI);
  const dbName = String(process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB').trim();

  if (!uri) {
    console.error('❌ Missing MongoDB URI. Set MONGODB_URI_MAIN or MONGODB_URI in your environment.');
    process.exit(1);
  }

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });

  const users = mongoose.connection.db.collection('users');
  const admins = await users
    .find({ isAdmin: true })
    .project({ userId: 1, email: 1, role: 1, isAdmin: 1, createdAt: 1, updatedAt: 1 })
    .sort({ userId: 1 })
    .toArray();

  console.log(`Admin users count: ${admins.length}`);
  for (const u of admins) {
    console.log(`- ${u.userId || '(no userId)'}  ${u.email || '(no email)'}  role=${u.role || '(none)'}`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('❌ Failed:', err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
