const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    await mongoose.connect(mongoUri, {
      dbName,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
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
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();
