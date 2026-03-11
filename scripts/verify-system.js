require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function verifySysterm() {
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
      .project({ userId: 1, permanentTenantId: 1, qrBridgeUrl: 1, qrBridgeSecret: 1, qrWhatsappEnabled: 1 })
      .sort({ userId: 1 })
      .toArray();

    console.log(`📊 SYSTEM VERIFICATION (${allUsers.length} CRM users)\n`);
    console.log('┌─────────────────────────────────┬──────────┬──────────┬────────┐');
    console.log('│ User ID                         │ Tenant ID│ Secret   │ Shared?│');
    console.log('├─────────────────────────────────┼──────────┼──────────┼────────┤');

    let fullCount = 0;
    let issueCount = 0;

    allUsers.forEach((user, idx) => {
      const userId = (user.userId || '').substring(0, 31).padEnd(31);
      const tenantId = user.permanentTenantId || 'MISSING❌';
      const hasSecret = user.qrBridgeSecret ? '✅ ' : '❌ ';
      const shared = user.qrWhatsappEnabled ? 'YES' : 'NO ';

      console.log(`│ ${userId} │ ${tenantId.padEnd(8)} │ ${hasSecret.padEnd(8)} │ ${shared.padEnd(6)} │`);

      if (user.permanentTenantId && user.qrBridgeSecret) {
        fullCount++;
      } else {
        issueCount++;
      }
    });

    console.log('└─────────────────────────────────┴──────────┴──────────┴────────┘\n');

    console.log(`✅ Ready for Bridge: ${fullCount}/${allUsers.length} users`);
    if (issueCount > 0) {
      console.log(`⚠️  Issues: ${issueCount} users missing permanent ID or secret`);
    }

    // Show bridge URL construction example
    console.log('\n🔗 Bridge URL Construction (Example for first user):');
    const firstUser = allUsers[0];
    if (firstUser?.permanentTenantId) {
      const bridgeUrl = `http://localhost:3333/tenant/${firstUser.permanentTenantId}`;
      console.log(`   Bridge URL: ${bridgeUrl}`);
      console.log(`   Secret: ${firstUser.qrBridgeSecret?.substring(0, 8)}... (${(firstUser.qrBridgeSecret || '').length} chars)`);
    }

    // Check for stray bridge URLs (should all be removed)
    const usersWithUrls = await collection
      .find({ qrBridgeUrl: { $exists: true, $ne: null } })
      .project({ userId: 1, qrBridgeUrl: 1 })
      .toArray();

    if (usersWithUrls.length > 0) {
      console.log(`\n⚠️  STRAY BRIDGE URLs FOUND (${usersWithUrls.length}):`);
      usersWithUrls.forEach(u => {
        console.log(`   - ${u.userId}: ${u.qrBridgeUrl}`);
      });
    } else {
      console.log('\n✅ No stray bridge URLs — system is clean');
    }

    console.log('\n✅ Verification complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifySysterm();
