// Debug helper: verify admin user exists + password matches
// Usage:
//   ADMIN_PASSWORD='...' node scripts/debug-admin-login.js
//   ADMIN_USERID='admincrm' ADMIN_PASSWORD='...' node scripts/debug-admin-login.js

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ADMIN_USERID = (process.env.ADMIN_USERID || 'admincrm').trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();

const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const dbName = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

async function main() {
  if (!mongoUri) {
    console.error('Missing MONGODB_URI_MAIN/MONGODB_URI');
    process.exit(1);
  }
  if (!ADMIN_PASSWORD) {
    console.error('Missing ADMIN_PASSWORD');
    process.exit(1);
  }

  const connectOnce = async () => {
    await mongoose.connect(mongoUri, {
      dbName,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      tls: true,
      retryWrites: true,
    });
  };

  try {
    await connectOnce();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTlsLike = /tlsv1 alert internal error|ERR_SSL|SSL routines/i.test(msg);
    if (!isTlsLike) throw e;
    try {
      await mongoose.disconnect();
    } catch {}
    console.warn('⚠️  First connect failed, retrying once...');
    await connectOnce();
  }

  const userSchema = new mongoose.Schema(
    {
      userId: { type: String, sparse: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      isAdmin: { type: Boolean, default: false },
      role: { type: String },
      permissions: { type: [String] },
    },
    { collection: 'users' }
  );

  const User = mongoose.models.User || mongoose.model('User', userSchema);

  const user = await User.findOne({ userId: ADMIN_USERID }).lean();

  if (!user) {
    console.log('NO_USER');
    process.exit(2);
  }

  const match = await bcrypt.compare(ADMIN_PASSWORD, user.password);

  console.log({
    userId: user.userId,
    email: user.email,
    isAdmin: user.isAdmin,
    role: user.role,
    permissions: user.permissions,
    passwordPrefix: String(user.password || '').slice(0, 7),
    bcryptMatch: match,
  });

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
