#!/usr/bin/env node
/**
 * Detailed diagnostic of CRM user settings
 * Shows exactly which users can access the bridge
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI_MAIN environment variable not set');
  process.exit(1);
}

async function main() {
  let connection;
  try {
    console.log('🔍 Connecting to MongoDB...\n');
    connection = await mongoose.connect(MONGODB_URI, {
      dbName: CRM_DB_NAME,
      authSource: 'admin',
    });

    const db = mongoose.connection.db;
    const settings = db.collection('crm_user_settings');

    // Also check the users collection to identify super admins
    const users = db.collection('users');

    console.log('📋 CRM User Settings Diagnostic\n');
    console.log('═'.repeat(120));

    const allUsers = await settings.find({}).toArray();
    
    // Check for super admins
    const SUPER_ADMIN_IDS = new Set(['admin', 'admincrm']);

    for (const user of allUsers) {
      const isSuperAdmin = SUPER_ADMIN_IDS.has(user.userId);
      const hasPermaTenantId = !!user.permanentTenantId;
      const hasQrBridgeUrl = !!user.qrBridgeUrl;
      const hasQrWhatsappEnabled = !!user.qrWhatsappEnabled;

      console.log(`\n👤 ${user.userId}`);
      console.log(`   Role: ${isSuperAdmin ? '🔴 SUPER ADMIN' : '🟢 CRM User'}`);
      console.log(`   permanentTenantId: ${hasPermaTenantId ? `✅ ${user.permanentTenantId}` : '❌ MISSING'}`);
      console.log(`   qrBridgeUrl: ${hasQrBridgeUrl ? `✅ ${user.qrBridgeUrl.substring(0, 50)}...` : '❌ MISSING'}`);
      console.log(`   qrWhatsappEnabled: ${hasQrWhatsappEnabled ? '✅ YES' : '❌ NO'}`);

      // Determine if user can access QR bridge
      let bridgeAccess = '❌ BLOCKED';
      let reason = '';

      if (isSuperAdmin) {
        bridgeAccess = '✅ YES (Super Admin)';
      } else if (hasPermaTenantId) {
        bridgeAccess = '✅ YES (has permanentTenantId)';
      } else if (hasQrBridgeUrl) {
        bridgeAccess = '✅ YES (has custom qrBridgeUrl)';
      } else if (hasQrWhatsappEnabled) {
        bridgeAccess = '✅ YES (qrWhatsappEnabled for shared)';
        // But check if they're a tenant owner
        const tenantDoc = await db.collection('tenants').findOne({
          $or: [
            { ownerUserId: user.userId },
            { adminUserId: user.userId },
            { ownerEmail: user.userId },
          ],
        });
        if (tenantDoc) {
          bridgeAccess = '❌ BLOCKED (Tenant owner - must use own bridge)';
          reason = ` - They own tenant: ${tenantDoc._id}`;
        }
      } else {
        bridgeAccess = '❌ BLOCKED (No bridge access configured)';
      }

      console.log(`   Bridge Access: ${bridgeAccess}${reason}`);
    }

    console.log('\n' + '═'.repeat(120));
    console.log(`\n📊 Summary:`);
    console.log(`   Total users: ${allUsers.length}`);
    console.log(`   With permanentTenantId: ${allUsers.filter(u => u.permanentTenantId).length}`);
    console.log(`   With qrWhatsappEnabled: ${allUsers.filter(u => u.qrWhatsappEnabled).length}`);
    console.log(`   With qrBridgeUrl: ${allUsers.filter(u => u.qrBridgeUrl).length}`);

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
