#!/usr/bin/env node

/**
 * Script to fix Facebook leads with wrong 'phone' field
 * Migrates leads with 'phone' field to use 'phoneNumber' field
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const CRM_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

async function fixFacebookLeads() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);

    const crmDb = mongoose.connection.useDb(CRM_DB_NAME, { useCache: true });
    const LeadSchema = new mongoose.Schema({}, { collection: 'leads', strict: false });
    const Lead = crmDb.model('Lead', LeadSchema);

    console.log(`📊 Checking ${CRM_DB_NAME}.leads for leads with wrong 'phone' field...`);

    // Find leads with 'phone' field but no 'phoneNumber' field
    const wrongLeads = await Lead.find({
      phone: { $exists: true },
      phoneNumber: { $exists: false },
    });

    console.log(`\n✅ Found ${wrongLeads.length} lead(s) with wrong 'phone' field\n`);

    if (wrongLeads.length === 0) {
      console.log('✨ No leads to fix! Facebook leads are correct.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Show sample
    console.log('Sample lead before fix:');
    console.log(JSON.stringify(wrongLeads[0].toObject(), null, 2));

    // Migrate: Set phoneNumber = phone, then remove phone
    let fixed = 0;
    for (const lead of wrongLeads) {
      try {
        if (lead.phone) {
          lead.phoneNumber = lead.phone;
          lead.phone = undefined;
          await lead.save();
          fixed++;
          console.log(`✓ Fixed: ${lead._id} - phoneNumber set to "${lead.phoneNumber}"`);
        }
      } catch (err) {
        console.error(
          `✗ Error fixing lead ${lead._id}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    console.log(`\n📈 Fixed ${fixed}/${wrongLeads.length} leads`);

    // Verify the fix
    const stillWrong = await Lead.find({
      phone: { $exists: true },
      phoneNumber: { $exists: false },
    });

    if (stillWrong.length === 0) {
      console.log('✨ All leads fixed! Facebook leads will now show in CRM.\n');
    } else {
      console.log(`⚠️  ${stillWrong.length} lead(s) still have issues.\n`);
    }

    await mongoose.connection.close();
    process.exit(fixed > 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

fixFacebookLeads();
