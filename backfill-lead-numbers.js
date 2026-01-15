#!/usr/bin/env node
/**
 * Backfill missing leadNumbers for existing leads
 * Run: node backfill-lead-numbers.js
 */
require('dotenv').config({ path: '/Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db/.env.local' });

const { MongoClient } = require('mongodb');

console.log('Env check:', {
  uri: process.env.MONGODB_URI_MAIN ? '✓' : '✗',
  crmDb: process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm'
});

const LEAD_NUMBER_START = 6999;

function formatLeadNumber(seq) {
  return String(seq).padStart(6, '0');
}

async function backfillLeadNumbers() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  
  try {
    await client.connect();
    const crmDb = client.db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const leadsCollection = crmDb.collection('leads');
    const counterCollection = crmDb.collection('crm_counters');

    // Find leads without leadNumber
    const missingLeads = await leadsCollection
      .find({
        $or: [
          { leadNumber: { $exists: false } },
          { leadNumber: null },
          { leadNumber: '' }
        ]
      })
      .sort({ createdAt: 1 })
      .limit(500)
      .toArray();

    console.log(`\n📋 Found ${missingLeads.length} leads without leadNumber\n`);

    if (missingLeads.length === 0) {
      console.log('✅ All leads have leadNumbers!\n');
      return;
    }

    let updated = 0;
    for (const lead of missingLeads) {
      try {
        // Atomically increment counter and get new value
        const counterResult = await counterCollection.findOneAndUpdate(
          { _id: 'leadNumber' },
          [
            {
              $set: {
                seq: {
                  $add: [
                    { $ifNull: ['$seq', LEAD_NUMBER_START - 1] },
                    1
                  ]
                }
              }
            }
          ],
          { 
            returnDocument: 'after',
            upsert: true
          }
        );

        if (counterResult.value) {
          const seq = counterResult.value.seq;
          const leadNumber = formatLeadNumber(seq);
          
          const updateResult = await leadsCollection.updateOne(
            { _id: lead._id },
            { $set: { leadNumber } }
          );

          if (updateResult.modifiedCount > 0) {
            updated++;
            console.log(`✅ Lead ${lead.phoneNumber || lead._id}: ${leadNumber}`);
          }
        }
      } catch (err) {
        console.error(`❌ Error updating lead ${lead._id}:`, err.message);
      }
    }

    console.log(`\n✅ Updated ${updated} leads with leadNumbers\n`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

backfillLeadNumbers();
