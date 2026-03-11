require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkAllCRMUsers() {
  const uri = process.env.MONGODB_URI_MAIN;
  const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

  if (!uri) {
    console.error('❌ MONGODB_URI_MAIN not set');
    process.exit(1);
  }

  try {
    console.log('🔗 Connecting to MongoDB...\n');
    await mongoose.connect(uri, {
      dbName: crmDbName,
      retryWrites: true,
      w: 'majority',
    });

    const db = mongoose.connection.db;
    const collection = db.collection('crm_user_settings');

    // Get all users
    const allUsers = await collection
      .find()
      .sort({ userId: 1 })
      .toArray();

    console.log(`📊 All CRM Users (${allUsers.length} total)\n`);
    console.log('┌─────────────────────────────────┬──────────┬─────────────────┐');
    console.log('│ User ID                         │ Tenant ID│ Status          │');
    console.log('├─────────────────────────────────┼──────────┼─────────────────┤');

    allUsers.forEach((user, idx) => {
      const userId = (user.userId || '').substring(0, 31).padEnd(31);
      const tenantId = (user.permanentTenantId || 'NONE').padEnd(8);
      const status = user.qrBridgeSecret ? '✅ Ready' : '❌ Missing Secret';
      console.log(`│ ${userId} │ ${tenantId}│ ${status.padEnd(15)} │`);
    });

    console.log('└─────────────────────────────────┴──────────┴─────────────────┘\n');

    // Find test users
    const testUsers = allUsers.filter(u => u.userId.includes('test') || u.userId.includes('Test'));
    if (testUsers.length > 0) {
      console.log(`🧪 Test Users Found (${testUsers.length}):\n`);
      testUsers.forEach(user => {
        console.log(`  User: ${user.userId}`);
        console.log(`    - Permanent ID: ${user.permanentTenantId}`);
        console.log(`    - Bridge Secret: ${user.qrBridgeSecret?.substring(0, 8)}... (${(user.qrBridgeSecret || '').length} chars)`);
        console.log(`    - QR Enabled: ${user.qrWhatsappEnabled || false}`);
        console.log();
      });
    }

    console.log('✅ Check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAllCRMUsers();
