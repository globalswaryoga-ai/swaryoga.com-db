#!/usr/bin/env node

/**
 * Quick Super Admin Permission Grant Script
 * Run: node scripts/grant-super-admin-quick.js <username>
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

// All permission modules with all actions enabled
const SUPER_ADMIN_PERMISSIONS = {
  leads: { read: true, write: true, delete: true, export: true, import: true },
  messages: { read: true, send: true, broadcast: true, delete: true },
  whatsapp: { read: true, send: true, broadcast: true, manageTemplates: true },
  email: { read: true, send: true, broadcast: true, manageTemplates: true },
  analytics: { read: true, export: true },
  community: { read: true, write: true, delete: true, moderate: true },
  workshops: { read: true, write: true, delete: true, manage: true },
  users: { read: true, write: true, delete: true, managePermissions: true },
  settings: { read: true, write: true },
  reports: { read: true, generate: true, export: true },
  integrations: { read: true, write: true, manage: true },
  campaigns: { read: true, write: true, delete: true, execute: true },
  notes: { read: true, write: true, delete: true },
  tasks: { read: true, write: true, delete: true, assign: true },
  calendar: { read: true, write: true, delete: true, manage: true },
  payments: { read: true, write: true, refund: true, export: true },
  media: { read: true, upload: true, delete: true, manage: true }
};

async function grantSuperAdmin() {
  const username = process.argv[2];
  
  if (!username) {
    console.error('❌ Please provide a username');
    console.log('Usage: node scripts/grant-super-admin-quick.js <username>');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const crmDb = mongoose.connection.useDb(CRM_DB_NAME);
    
    // Define user schema inline (with flexible _id for legacy users)
    const userSchema = new mongoose.Schema({
      _id: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String
      username: String,
      password: String,
      email: String,
      role: String,
      permissions: [String],
      permissionsV2: Object,
      isAdmin: Boolean,
      createdAt: Date,
      updatedAt: Date
    }, { strict: false });

    const User = crmDb.model('User', userSchema, 'users');

    // Find user
    const user = await User.findOne({ username });
    
    if (!user) {
      console.error(`❌ User "${username}" not found`);
      console.log('\nAvailable users:');
      const users = await User.find({}, 'username email role');
      users.forEach(u => {
        console.log(`  - ${u.username} (${u.email || 'no email'}) [${u.role || 'no role'}]`);
      });
      process.exit(1);
    }

    console.log(`📝 Found user: ${username}`);
    console.log(`   Current role: ${user.role || 'none'}`);
    console.log(`   Is admin: ${user.isAdmin || false}`);
    console.log(`   Permissions V1: ${JSON.stringify(user.permissions || [])}`);
    
    // Update user with super admin permissions
    user.role = 'super-admin';
    user.isAdmin = true;
    user.permissions = ['all'];
    user.permissionsV2 = SUPER_ADMIN_PERMISSIONS;
    user.name = 'Swar Yoga';
    user.updatedAt = new Date();
    
    await user.save();
    
    console.log('\n✅ Super admin permissions granted!');
    console.log('📋 Permissions V2 modules enabled:');
    Object.keys(SUPER_ADMIN_PERMISSIONS).forEach(module => {
      const actions = Object.keys(SUPER_ADMIN_PERMISSIONS[module]).filter(
        action => SUPER_ADMIN_PERMISSIONS[module][action]
      );
      console.log(`   ✓ ${module}: ${actions.join(', ')}`);
    });
    
    console.log('\n🎉 User can now access:');
    console.log('   - Admin Dashboard');
    console.log('   - CRM Pages (Leads, Messages, Analytics)');
    console.log('   - WhatsApp QR Messaging');
    console.log('   - Email Automation');
    console.log('   - User Management');
    console.log('   - All other admin features');
    
    console.log('\n💡 Please login again to refresh permissions');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Connection closed');
    process.exit(0);
  }
}

grantSuperAdmin();
