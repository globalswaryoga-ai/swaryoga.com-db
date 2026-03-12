#!/usr/bin/env node
/**
 * Ensure all CRM users have permanentTenantIds
 * This fixes the 403 "This action is restricted to Super Admin" error
 * by ensuring every CRM user has a unique tenant ID
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI_MAIN environment variable not set');
  process.exit(1);
}

// Starting tenant ID (7-digit format)
let nextTenantId = 2456;

function generateTenantId() {
  const id = String(nextTenantId).padStart(7, '0');
  nextTenantId++;
  return id;
}

function generateBridgeSecret() {
  return crypto.randomBytes(32).toString('hex');
}

async function main() {
  let connection;
  try {
    console.log('🔍 Connecting to MongoDB...');
    connection = await mongoose.connect(MONGODB_URI, {
      dbName: CRM_DB_NAME,
      authSource: 'admin',
    });

    const db = mongoose.connection.db;
    const settings = db.collection('crm_user_settings');

    console.log('📋 Fetching all CRM users...');
    const allUsers = await settings.find({}).toArray();

    console.log(`\n📊 Total CRM users: ${allUsers.length}\n`);

    const usersNeedingIds = allUsers.filter(u => !u.permanentTenantId);
    const usersWithIds = allUsers.filter(u => u.permanentTenantId);

    console.log(`✅ Users already have permanentTenantId: ${usersWithIds.length}`);
    console.log(`❌ Users NEEDING permanentTenantId: ${usersNeedingIds.length}\n`);

    if (usersNeedingIds.length === 0) {
      console.log('✨ All users already have permanentTenantIds!');
      process.exit(0);
    }

    console.log('Assigning permanentTenantIds to missing users...\n');

    // Find the highest existing tenant ID
    const maxTenantId = Math.max(
      ...usersWithIds
        .map(u => parseInt(u.permanentTenantId || '0', 10))
        .filter(id => !isNaN(id))
    );
    if (maxTenantId > 0) {
      nextTenantId = maxTenantId + 1;
    }

    let updated = 0;
    for (const user of usersNeedingIds) {
      const newTenantId = generateTenantId();
      const newSecret = generateBridgeSecret();

      const result = await settings.updateOne(
        { userId: user.userId },
        {
          $set: {
            permanentTenantId: newTenantId,
            qrBridgeSecret: newSecret,
            updatedAt: new Date(),
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ ${user.userId}`);
        console.log(`   permanentTenantId: ${newTenantId}`);
        console.log(`   qrBridgeSecret: ${newSecret}`);
        console.log('');
        updated++;
      }
    }

    console.log(`\n✨ Successfully updated ${updated} users with permanentTenantIds`);
    console.log('\n🎉 All CRM users now have tenant IDs!');
    console.log('Users can now refresh their QR codes without 403 errors.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.disconnect();
    }
  }
}

main();
