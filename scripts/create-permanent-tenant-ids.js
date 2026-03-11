/**
 * Create Permanent Tenant IDs
 * 
 * Generates persistent 7-digit tenant IDs (e.g., "0002456", "0002457") for all CRM users.
 * These IDs are:
 * - Generated once per user (never changes)
 * - Used in bridge paths: http://localhost:3333/tenant/0002456
 * - Linked to email & mobile via crm_user_settings
 * - Connected to WhatsApp numbers scanned via QR
 * 
 * Usage:
 *   node scripts/create-permanent-tenant-ids.js [--dry-run] [--verbose]
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load env from .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const MONGODB_URI = process.env.MONGODB_URI_MAIN;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI_MAIN env var');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');
const isVerbose = process.argv.includes('--verbose');

// Starting 7-digit code
const STARTING_CODE = 2456;

async function main() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    const crmDb = mongoose.connection.useDb(CRM_DB_NAME, { useCache: true });

    const CRMUserSettingsCollection = crmDb.collection('crm_user_settings');

    // Get all CRM users without permanent tenant IDs
    console.log('📋 Fetching CRM users...');
    const usersWithoutIds = await CRMUserSettingsCollection.find(
      { permanentTenantId: { $exists: false } } // or { $eq: null }
    ).toArray();

    console.log(`Found ${usersWithoutIds.length} users without permanent tenant IDs\n`);

    if (usersWithoutIds.length === 0) {
      console.log('✅ All users already have permanent tenant IDs!');
      await mongoose.connection.close();
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Generate permanent ID for each user
    for (let i = 0; i < usersWithoutIds.length; i++) {
      const user = usersWithoutIds[i];
      const tenantCode = STARTING_CODE + i; // 0002456, 0002457, 0002458, etc.
      const permanentId = String(tenantCode).padStart(7, '0'); // Ensure 7 digits

      if (isVerbose) {
        console.log(`[${i + 1}/${usersWithoutIds.length}] User: ${user.userId}`);
        console.log(`  Permanent ID: ${permanentId}`);
      }

      try {
        if (!isDryRun) {
          const result = await CRMUserSettingsCollection.updateOne(
            { userId: user.userId },
            { $set: { permanentTenantId: permanentId } }
          );

          if (result.modifiedCount === 1) {
            if (isVerbose) console.log(`  ✅ Updated`);
            successCount++;
          } else {
            if (isVerbose) console.log(`  ⚠️  Not modified (may already have ID)`);
            skippedCount++;
          }
        } else {
          if (isVerbose) console.log(`  [DRY-RUN] Would update`);
          successCount++;
        }
      } catch (err) {
        console.warn(`  ❌ Error for ${user.userId}: ${err.message}`);
        errorCount++;
      }

      if (!isVerbose && (i + 1) % 5 === 0) {
        console.log(`  Progress: ${i + 1}/${usersWithoutIds.length}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('Migration Summary'.padEnd(80));
    console.log('='.repeat(80));
    console.log(`✅ Generated: ${successCount}`);
    console.log(`⚠️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE'}`);
    console.log(`ID Range: ${String(STARTING_CODE).padStart(7, '0')} - ${String(STARTING_CODE + usersWithoutIds.length - 1).padStart(7, '0')}`);
    console.log('='.repeat(80));

    if (successCount > 0 && !isDryRun) {
      console.log('\n✅ Permanent tenant IDs created successfully!\n');
      console.log('Next steps:');
      console.log('1. Update qr-bridge proxy to use permanentTenantId in bridge path');
      console.log('2. Update auto-provision endpoint to use permanentTenantId');
      console.log('3. Test QR WhatsApp with multiple tenants');
      console.log('4. Bridge must support /tenant/{permanentTenantId} routing\n');
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
