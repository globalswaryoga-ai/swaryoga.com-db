require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function testSettingsEndpoint() {
  const uri = process.env.MONGODB_URI_MAIN;
  const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

  if (!uri) {
    console.error('❌ MONGODB_URI_MAIN not set');
    process.exit(1);
  }

  try {
    console.log('🔗 Connecting to MongoDB for admincrm...\n');
    await mongoose.connect(uri, {
      dbName: crmDbName,
      retryWrites: true,
      w: 'majority',
    });

    const db = mongoose.connection.db;
    const collection = db.collection('crm_user_settings');

    // Get admincrm settings
    const adminSettings = await collection.findOne(
      { userId: 'admincrm' }
    );

    console.log('📊 Super Admin (admincrm) Settings:\n');
    console.log(`  permanentTenantId: ${adminSettings?.permanentTenantId || 'MISSING'}`);
    console.log(`  qrBridgeSecret: ${adminSettings?.qrBridgeSecret?.substring(0, 8)}... (${(adminSettings?.qrBridgeSecret || '').length} chars)`);
    console.log(`  qrBridgeUrl: ${adminSettings?.qrBridgeUrl || 'NONE (will derive from permanentTenantId)'}`);
    console.log(`  qrWhatsappEnabled: ${adminSettings?.qrWhatsappEnabled || false}`);

    // Test bridge URL derivation
    if (adminSettings?.permanentTenantId) {
      const bridgeBase = 'http://localhost:3333';
      const derivedUrl = `${bridgeBase}/tenant/${adminSettings.permanentTenantId}`;
      console.log(`\n🔗 Derived Bridge URL: ${derivedUrl}`);
    }

    console.log('\n✅ Settings ready!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSettingsEndpoint();
