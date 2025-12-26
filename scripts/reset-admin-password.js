#!/usr/bin/env node

/**
 * Reset (or create) an admin user's password safely.
 *
 * This script NEVER prints secrets.
 *
 * Usage (recommended):
 *   ADMIN_IDENTIFIER="admin" ADMIN_NEW_PASSWORD="..." node scripts/reset-admin-password.js
 *
 * Where ADMIN_IDENTIFIER can be userId or email.
 * Optional:
 *   ADMIN_CREATE_IF_MISSING=1   # create admin user if not found
 *   ADMIN_USERID="admin"       # used when creating
 *   ADMIN_EMAIL="admin@swaryoga.com"  # used when creating
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

function requiredEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    return null;
  }
  return String(v).trim();
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(String(answer || '').trim());
    });
  });
}

async function requiredValue(name, humanLabel) {
  const fromEnv = requiredEnv(name);
  if (fromEnv) return fromEnv;

  const answer = await prompt(`${humanLabel}: `);
  if (!answer) {
    console.error(`❌ Missing required value: ${name}`);
    process.exit(1);
  }
  return answer;
}

async function main() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

  if (!uri) {
    console.error('❌ Missing MongoDB URI. Set MONGODB_URI_MAIN or MONGODB_URI in your environment.');
    process.exit(1);
  }

  const identifier = await requiredValue('ADMIN_IDENTIFIER', 'Admin identifier (userId or email)');
  const newPassword = await requiredValue('ADMIN_NEW_PASSWORD', 'New password');

  const createIfMissingEnv = String(process.env.ADMIN_CREATE_IF_MISSING || '').trim();
  const createIfMissing = createIfMissingEnv
    ? createIfMissingEnv === '1'
    : ['y', 'yes'].includes((await prompt('Create user if missing? (y/N): ')).toLowerCase());

  const createUserId = (process.env.ADMIN_USERID || identifier).trim();
  const createEmail = (process.env.ADMIN_EMAIL || '').trim() || undefined;

  console.log('🔐 Admin password reset (safe mode)');
  console.log(`• DB: ${dbName}`);
  console.log(`• Identifier: ${identifier}`);
  console.log(`• Create if missing: ${createIfMissing ? 'YES' : 'NO'}`);

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
  });

  const userSchema = new mongoose.Schema(
    {
      userId: { type: String, sparse: true },
      email: { type: String, sparse: true },
      password: { type: String, required: true },
      isAdmin: { type: Boolean, default: false },
      role: { type: String, default: 'user' },
      permissions: { type: [String], default: ['all'] },
      updatedAt: { type: Date, default: Date.now },
      createdAt: { type: Date, default: Date.now },
    },
    { strict: false }
  );

  const User = mongoose.models.User || mongoose.model('User', userSchema);

  const identifierLower = identifier.toLowerCase();
  let user = await User.findOne({
    $or: [
      { userId: identifier },
      { email: identifierLower },
    ],
  });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  if (!user) {
    if (!createIfMissing) {
      console.error('❌ Admin user not found.');
      console.error('   If you want to create it, rerun with: ADMIN_CREATE_IF_MISSING=1');
      await mongoose.disconnect();
      process.exit(1);
    }

    if (!createUserId) {
      console.error('❌ Cannot create admin: missing ADMIN_USERID');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Align with app's User schema: email is required.
    const finalEmail = createEmail || (await requiredValue('ADMIN_EMAIL', 'Admin email (required for create)'));
    const finalEmailLower = String(finalEmail).trim().toLowerCase();

    user = new User({
      userId: createUserId,
      email: finalEmailLower,
      password: hashedPassword,
      isAdmin: true,
      role: 'admin',
      permissions: ['all'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await user.save();

    console.log('✅ Admin user created and password set.');
    console.log(`• userId: ${user.userId || '(none)'}`);
    console.log(`• email: ${user.email || '(none)'}`);
    console.log('• isAdmin: true');

    await mongoose.disconnect();
    return;
  }

  user.password = hashedPassword;
  user.isAdmin = true;
  user.role = 'admin';
  user.permissions = ['all'];
  user.updatedAt = new Date();

  // Normalize email if present (doesn't invent one for existing users).
  if (typeof user.email === 'string' && user.email.trim()) {
    user.email = user.email.trim().toLowerCase();
  }

  await user.save();

  console.log('✅ Admin password reset successful.');
  console.log(`• userId: ${user.userId || '(none)'}`);
  console.log(`• email: ${user.email || '(none)'}`);
  console.log(`• isAdmin: ${user.isAdmin ? 'true' : 'false'}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('❌ Failed:', err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
