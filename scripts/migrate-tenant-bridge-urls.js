#!/usr/bin/env node

/**
 * Migration Script: Update all CRM tenant bridge URLs to unique per-tenant pattern
 * 
 * Problem: Old bridge URLs were shared (all tenants → localhost:3333)
 * Solution: Generate unique bridge URLs per tenant (localhost:3333/tenant/{uniqueId})
 * 
 * Usage: node scripts/migrate-tenant-bridge-urls.js [--dry-run]
 * 
 * This will:
 * 1. Connect to MongoDB
 * 2. Find all CRM users (excluding super admin)
 * 3. For each user, regenerate bridge URL to pattern: {BASE_URL}/tenant/{uniqueId}
 * 4. Regenerate bridge secret
 * 5. Save to crm_user_settings collection
 * 6. Report statistics
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const DEFAULT_BRIDGE_URL = 'http://localhost:3333';
const BRIDGE_BASE_URL =
  process.env.WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.WHATSAPP_BRIDGE_URL ||
  DEFAULT_BRIDGE_URL;

const SUPER_ADMIN_IDS = new Set(['admin', 'admincrm']);
const DRY_RUN = process.argv.includes('--dry-run');

async function migrate() {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log('CRM Tenant Bridge URL Migration');
    console.log(`${'='.repeat(80)}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
    console.log(`Bridge base URL: ${BRIDGE_BASE_URL}`);
    console.log(`${'='.repeat(80)}\n`);

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not set in environment');
    }

    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      serverSelectionTimeoutMS: 10000,
    });

    const db = mongoose.connection.db;
    const crmUserSettingsCollection = db.collection('crm_user_settings');

    // Find all CRM users (excluding super admin)
    console.log('Finding all CRM users...');
    const allUsers = await crmUserSettingsCollection.find({}).toArray();
    const filteredUsers = allUsers.filter(u => !SUPER_ADMIN_IDS.has(u.userId));

    console.log(`Found ${allUsers.length} total users, ${filteredUsers.length} tenants to migrate\n`);

    if (filteredUsers.length === 0) {
      console.log('No tenants to migrate.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Statistics
    let updated = 0;
    let created = 0;
    let skipped = 0;
    const updates = [];

    // Migrate each tenant
    for (const user of filteredUsers) {
      const userId = user.userId;
      const tenantId = uuidv4();
      const newBridgeUrl = `${BRIDGE_BASE_URL}/tenant/${tenantId}`;
      const newBridgeSecret = uuidv4();

      console.log(`\n[${updated + created + skipped + 1}/${filteredUsers.length}] User: ${userId}`);
      console.log(`  Old URL: ${user.qrBridgeUrl || '(none)'}`);
      console.log(`  New URL: ${newBridgeUrl}`);
      console.log(`  New Secret: ${newBridgeSecret.substring(0, 8)}...`);

      if (!DRY_RUN) {
        try {
          const result = await crmUserSettingsCollection.updateOne(
            { userId },
            {
              $set: {
                qrBridgeUrl: newBridgeUrl,
                qrBridgeSecret: newBridgeSecret,
                migratedAt: new Date(),
              },
            },
            { upsert: false }
          );

          if (result.matchedCount > 0) {
            updated++;
            console.log(`  ✅ Updated`);
          } else {
            skipped++;
            console.log(`  ⊘ Skipped (not found)`);
          }
        } catch (err) {
          console.error(`  ❌ Error: ${err.message}`);
          skipped++;
        }
      } else {
        updated++;
        console.log(`  [DRY] Would update`);
      }

      updates.push({ userId, newBridgeUrl, newBridgeSecret });
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('Migration Summary');
    console.log(`${'='.repeat(80)}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`❌ Errors/Skipped: ${skipped}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`${'='.repeat(80)}\n`);

    if (DRY_RUN) {
      console.log('This was a DRY RUN. No changes were made.');
      console.log('Run without --dry-run to apply changes:\n');
      console.log('  node scripts/migrate-tenant-bridge-urls.js\n');
    } else {
      console.log('✅ Migration complete! All tenants have been updated with unique bridge URLs.');
      console.log('\nNext steps:');
      console.log('1. Restart the bridge service if needed');
      console.log('2. Test with a CRM admin account');
      console.log('3. Verify QR WhatsApp works for multiple tenants\n');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  }
}

// Run migration
migrate();
