#!/usr/bin/env node

/**
 * Migration Script: Legacy Permissions to Granular Permissions V2
 * 
 * This script migrates all admin users from the old permission array format
 * to the new granular permissionsV2 structure.
 * 
 * Usage:
 *   node scripts/migrate-permissions.js
 * 
 * Options:
 *   DRY_RUN=1 node scripts/migrate-permissions.js  # Preview changes without saving
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';
const DRY_RUN = process.env.DRY_RUN === '1';

// Permission presets (mirrored from lib/permissions.ts)
const PERMISSION_PRESETS = {
  SUPER_ADMIN: {
    isSuperAdmin: true,
    leads: { read: true, write: true, delete: true, export: true, assignToOthers: true, viewAll: true },
    contacts: { read: true, write: true, delete: true, export: true },
    customers: { read: true, write: true, delete: true, export: true },
    whatsapp: { read: true, send: true, broadcast: true, manageGroups: true, viewMedia: true },
    email: { read: true, send: true, broadcast: true, manageTemplates: true },
    messages: { read: true, send: true, delete: true },
    broadcasts: { read: true, create: true, send: true, schedule: true, delete: true },
    templates: { read: true, write: true, delete: true },
    workshops: { read: true, write: true, delete: true, manageRegistrations: true, viewPayments: true },
    payments: { read: true, write: true, refund: true, export: true },
    invoices: { read: true, write: true, delete: true, export: true },
    analytics: { read: true, export: true },
    reports: { read: true, create: true, export: true },
    dashboard: { read: true },
    users: { read: true, write: true, delete: true, managePermissions: true },
    settings: { read: true, write: true },
    auditLogs: { read: true, export: true },
  },
};

function migrateOldPermissions(oldPermissions) {
  if (oldPermissions.includes('all')) {
    return PERMISSION_PRESETS.SUPER_ADMIN;
  }
  
  const userPermissions = { isSuperAdmin: false };
  
  // Map old permissions to new structure
  if (oldPermissions.includes('crm')) {
    userPermissions.leads = { read: true, write: true, delete: false, export: true };
    userPermissions.contacts = { read: true, write: true, delete: false, export: true };
  }
  
  if (oldPermissions.includes('whatsapp')) {
    userPermissions.whatsapp = { read: true, send: true, broadcast: true, manageGroups: true, viewMedia: true };
  }
  
  if (oldPermissions.includes('email')) {
    userPermissions.email = { read: true, send: true, broadcast: true, manageTemplates: true };
  }
  
  if (oldPermissions.includes('broadcasts')) {
    userPermissions.broadcasts = { read: true, create: true, send: true, schedule: true, delete: false };
  }
  
  if (oldPermissions.includes('analytics')) {
    userPermissions.analytics = { read: true, export: true };
    userPermissions.reports = { read: true, create: false, export: true };
  }
  
  if (oldPermissions.includes('users')) {
    userPermissions.users = { read: true, write: false, delete: false, managePermissions: false };
  }
  
  return userPermissions;
}

async function migratePermissions() {
  console.log('🔄 Starting Permission Migration');
  console.log('================================');
  console.log('');
  console.log(`📊 Database: ${DB_NAME}`);
  console.log(`🔗 URI: ${MONGODB_URI?.substring(0, 30)}...`);
  console.log(`🚦 Mode: ${DRY_RUN ? 'DRY RUN (no changes will be saved)' : 'LIVE (will update database)'}`);
  console.log('');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected successfully');
    console.log('');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find all admin users
    const adminUsers = await usersCollection.find({ isAdmin: true }).toArray();
    console.log(`👥 Found ${adminUsers.length} admin user(s)`);
    console.log('');

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of adminUsers) {
      const userId = user.userId || user.email || user._id.toString();
      
      // Skip if already has permissionsV2
      if (user.permissionsV2) {
        console.log(`⏭️  ${userId}: Already has permissionsV2, skipping`);
        skippedCount++;
        continue;
      }

      // Get legacy permissions
      const legacyPerms = Array.isArray(user.permissions) ? user.permissions : [];
      
      if (legacyPerms.length === 0) {
        console.log(`⚠️  ${userId}: No legacy permissions found, defaulting to CRM`);
      }

      // Migrate
      const permissionsV2 = migrateOldPermissions(legacyPerms.length > 0 ? legacyPerms : ['crm']);
      
      console.log(`🔄 ${userId}:`);
      console.log(`   Legacy: [${legacyPerms.join(', ') || 'none'}]`);
      console.log(`   New: ${permissionsV2.isSuperAdmin ? 'Super Admin' : `${Object.keys(permissionsV2).length - 1} modules`}`);

      if (!DRY_RUN) {
        try {
          await usersCollection.updateOne(
            { _id: user._id },
            { 
              $set: { 
                permissionsV2,
                updatedAt: new Date()
              } 
            }
          );
          console.log(`   ✅ Migrated successfully`);
          migratedCount++;
        } catch (err) {
          console.error(`   ❌ Error migrating: ${err.message}`);
          errorCount++;
        }
      } else {
        console.log(`   📋 Would migrate (dry run)`);
        migratedCount++;
      }
      console.log('');
    }

    // Summary
    console.log('================================');
    console.log('📊 Migration Summary');
    console.log('================================');
    console.log(`✅ Migrated: ${migratedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📦 Total: ${adminUsers.length}`);
    console.log('');

    if (DRY_RUN) {
      console.log('💡 This was a DRY RUN. No changes were saved.');
      console.log('   Run without DRY_RUN=1 to apply changes.');
    } else {
      console.log('✅ Migration complete! All admin users have been updated.');
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:');
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migratePermissions();
