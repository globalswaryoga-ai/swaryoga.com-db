require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function fixNonLocalhostUrls() {
  const uri = process.env.MONGODB_URI_MAIN;
  const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

  if (!uri) {
    console.error('❌ MONGODB_URI_MAIN not set');
    console.error('   Checked:', process.env.MONGODB_URI_MAIN ? 'Found' : 'Not found');
    process.exit(1);
  }

  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(uri, {
      dbName: crmDbName,
      retryWrites: true,
      w: 'majority',
    });

    const db = mongoose.connection.db;
    const collection = db.collection('crm_user_settings');

    // Find all users with bridge URLs pointing to external IPs
    const badUsers = await collection
      .find({
        qrBridgeUrl: {
          $exists: true,
          $ne: null,
          $not: { $regex: 'localhost|127\\.0\\.0\\.1' }
        }
      })
      .toArray();

    console.log(`\n⚠️  Found ${badUsers.length} users with external bridge URLs:`);
    badUsers.forEach(user => {
      console.log(`  - ${user.userId}: ${user.qrBridgeUrl}`);
    });

    if (badUsers.length > 0) {
      const result = await collection.updateMany(
        {
          qrBridgeUrl: {
            $exists: true,
            $ne: null,
            $not: { $regex: 'localhost|127\\.0\\.0\\.1' }
          }
        },
        {
          $unset: { qrBridgeUrl: 1 }
        }
      );

      console.log(`\n✅ Removed external bridge URLs from ${result.modifiedCount} users`);
    }

    // Show summary
    const summary = await collection
      .find()
      .project({ userId: 1, permanentTenantId: 1, qrBridgeUrl: 1 })
      .limit(5)
      .toArray();

    console.log('\n📋 Sample users after cleanup (first 5):');
    summary.forEach((user, idx) => {
      console.log(`  [${idx + 1}] ${user.userId}`);
      console.log(`      - Permanent ID: ${user.permanentTenantId || 'MISSING'}`);
      console.log(`      - Bridge URL: ${user.qrBridgeUrl || 'NONE → will use permanent ID'}`);
    });

    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixNonLocalhostUrls();
