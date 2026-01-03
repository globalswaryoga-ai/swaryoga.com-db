const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load env vars from .env / .env.local for local/dev usage.
// (Next.js loads these automatically, but plain Node scripts do not.)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.join(process.cwd(), '.env') });
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
} catch (_e) {
  // dotenv is optional; script can still run with exported env vars.
}

// NOTE:
// This script intentionally does NOT hardcode any credentials.
// Provide connection + admin credentials via environment variables.

const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const dbName = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

const ADMIN_RESET = String(process.env.ADMIN_RESET || '').trim() === '1';

const ADMIN_USERID = (process.env.ADMIN_USERID || 'admincrm').trim();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@swaryoga.com').trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();

async function createAdmin() {
  try {
    if (!mongoUri) {
      console.error('❌ Missing MongoDB URI. Set MONGODB_URI_MAIN or MONGODB_URI');
      process.exit(1);
    }
    if (!ADMIN_PASSWORD) {
      console.error('❌ Missing ADMIN_PASSWORD. Refusing to create admin without a password.');
      console.error('   Usage: ADMIN_PASSWORD="..." node create-admin.js');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB (URI hidden)...');
    // Notes on TLS:
    // - Atlas requires TLS.
    // - Some local environments (corporate proxies / antivirus / old OpenSSL) can cause
    //   TLS handshake failures that surface as "tlsv1 alert internal error".
    // - We explicitly enable TLS and keep timeouts modest for faster feedback.
    await mongoose.connect(mongoUri, {
      dbName,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      tls: true,
      retryWrites: true,
    });
    console.log('✅ Connected!');

    // Define User Schema (keep aligned with app's User model fields)
    const userSchema = new mongoose.Schema({
      userId: { type: String, sparse: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      isAdmin: { type: Boolean, default: false },
      role: { type: String, enum: ['admin', 'user', 'moderator'], default: 'user' },
      permissions: { type: [String], default: ['all'] },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ userId: ADMIN_USERID });
    if (existingAdmin) {
      if (!ADMIN_RESET) {
        console.log('⚠️  Admin user already exists. No changes made.');
        console.log('   To reset password and force admin flags, rerun with: ADMIN_RESET=1');
        await mongoose.disconnect();
        process.exit(0);
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

      existingAdmin.password = hashedPassword;
      existingAdmin.isAdmin = true;
      existingAdmin.role = 'admin';
      existingAdmin.permissions = ['all'];
      existingAdmin.updatedAt = new Date();
      if (ADMIN_EMAIL) existingAdmin.email = ADMIN_EMAIL;

      await existingAdmin.save();

      console.log('✅ Admin user updated successfully!');
      console.log('');
      console.log('📋 Admin Details:');
      console.log('=================');
      console.log(`User ID: ${ADMIN_USERID}`);
      console.log(`Email: ${existingAdmin.email || '(none)'}`);
      console.log('Password: (hidden)');
      console.log('Role: admin');
      console.log('isAdmin: true');
      console.log('');
      console.log('🔑 You can now login with these credentials!');

      await mongoose.disconnect();
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // Create admin user
    const adminUser = new User({
      userId: ADMIN_USERID,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      isAdmin: true,
      role: 'admin',
      permissions: ['all']
    });

    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📋 Admin Details:');
    console.log('=================');
    console.log(`User ID: ${ADMIN_USERID}`);
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log('Password: (hidden)');
    console.log('Role: admin');
    console.log('isAdmin: true');
    console.log('');
    console.log('🔑 You can now login with these credentials!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    const msg = error?.message || String(error);
    console.error('❌ Error:', msg);
    // Helpful context without leaking secrets
    console.error('   Debug hints:');
    console.error('   - Confirm Atlas Network Access allows your IP (0.0.0.0/0 for testing).');
    console.error('   - If you are on VPN/corporate Wi‑Fi, try switching networks/hotspot.');
    console.error('   - Ensure Node is modern (>= 18) so it has up-to-date TLS support.');
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();
