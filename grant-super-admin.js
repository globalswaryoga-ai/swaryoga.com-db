#!/usr/bin/env node
/**
 * Grant full super admin permissions to admincrm user
 * Usage: node grant-super-admin.js
 */

const mongoose = require('mongoose');

// Load environment variables - try multiple sources
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI_MAIN or MONGODB_URI is missing from environment');
  console.error('💡 Make sure .env or .env.local exists with MongoDB connection string');
  process.exit(1);
}

// Super admin permissions - FULL ACCESS
const SUPER_ADMIN_PERMISSIONS = [
  'all',              // Master permission
  'broadcast',        // Broadcast messages
  'leads:read',       // View leads
  'leads:write',      // Create/edit leads
  'leads:delete',     // Delete leads
  'messages:read',    // View messages
  'messages:write',   // Send messages
  'analytics',        // View analytics
  'users:manage',     // Manage users
  'workshops:manage', // Manage workshops
  'templates:manage', // Manage templates
  'settings:manage',  // System settings
  'crm:full',         // Full CRM access
  'whatsapp:send',    // Send WhatsApp
  'email:send',       // Send emails
  'payments:view',    // View payments
  'reports:generate'  // Generate reports
];

async function grantSuperAdminPermissions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.substring(0, 30)}...`);
    console.log(`   Database: ${DB_NAME}`);
    
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find the admincrm user
    console.log('\n🔍 Looking for admincrm user...');
    const adminUser = await usersCollection.findOne({ 
      $or: [
        { userId: 'admincrm' },
        { email: 'admincrm@swaryoga.com' },
        { email: { $regex: /admincrm/i } }
      ]
    });

    if (!adminUser) {
      console.error('❌ admincrm user not found!');
      console.log('\n💡 Available admin users:');
      const allAdmins = await usersCollection.find({ isAdmin: true }).toArray();
      allAdmins.forEach(u => {
        console.log(`   - ${u.userId || u.email} (${u._id})`);
      });
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✅ Found admincrm user: ${adminUser.email || adminUser.userId}`);
    console.log(`   Current permissions: ${JSON.stringify(adminUser.permissions || [])}`);

    // Update with full super admin permissions
    console.log('\n🚀 Granting SUPER ADMIN permissions...');
    const result = await usersCollection.updateOne(
      { _id: adminUser._id },
      {
        $set: {
          isAdmin: true,
          permissions: SUPER_ADMIN_PERMISSIONS,
          userId: 'admincrm',
          name: 'Swar Yoga',
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Successfully granted SUPER ADMIN permissions!');
      
      // Verify the update
      const updatedUser = await usersCollection.findOne({ _id: adminUser._id });
      console.log('\n📋 Updated permissions:');
      console.log(JSON.stringify(updatedUser.permissions, null, 2));
      console.log('\n🎉 admincrm now has FULL SUPER ADMIN ACCESS!');
      console.log('   - Can view/edit all leads');
      console.log('   - Can send broadcasts');
      console.log('   - Can manage all users');
      console.log('   - Can access all CRM features');
      console.log('   - Can manage system settings');
    } else {
      console.log('⚠️  No changes made (user already has these permissions)');
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
grantSuperAdminPermissions();
