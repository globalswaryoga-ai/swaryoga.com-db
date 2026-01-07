#!/usr/bin/env node

/**
 * FIX: Ensure incoming WhatsApp messages are linked to leads properly
 * 
 * Problem: Webhook creates leads and messages, but they might not be visible in UI
 * Solution: Verify the linkage and update if needed
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function fixIncomingMessages() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   FIX: WhatsApp Incoming Message Visibility        ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not set');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;

    console.log('📊 Analyzing incoming messages...\n');

    // Find all inbound messages in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const inboundMessages = await db
      .collection('whatsappmessages')
      .find({
        direction: 'inbound',
        createdAt: { $gte: twentyFourHoursAgo },
      })
      .toArray();

    console.log(`Found ${inboundMessages.length} inbound messages in last 24 hours\n`);

    let fixed = 0;
    let ok = 0;
    let errors = 0;

    for (const msg of inboundMessages) {
      const phoneNumber = msg.phoneNumber;
      const leadId = msg.leadId;

      // Check if lead exists
      let lead = null;
      if (leadId) {
        lead = await db
          .collection('leads')
          .findOne({ _id: new mongoose.Types.ObjectId(leadId) });
      }

      if (!lead) {
        // Try to find lead by phone number
        console.log(`Message ${msg._id.toString().substring(0, 8)}...:`);
        console.log(`  Phone: ${phoneNumber}`);
        console.log(`  Status: ❌ No lead found\n`);

        // Try to find by phone
        lead = await db
          .collection('leads')
          .findOne({ phoneNumber });

        if (lead) {
          console.log(`  Found lead by phone: ${lead._id}`);
          // Update message with correct leadId
          await db.collection('whatsappmessages').updateOne(
            { _id: msg._id },
            { $set: { leadId: lead._id } }
          );
          console.log(`  ✅ Updated message with correct leadId\n`);
          fixed++;
        } else {
          // Create new lead
          console.log(`  Creating new lead for phone ${phoneNumber}...`);
          const result = await db.collection('leads').insertOne({
            phoneNumber,
            source: 'whatsapp',
            status: 'lead',
            lastMessageAt: msg.createdAt,
            createdAt: msg.createdAt,
            updatedAt: msg.createdAt,
          });
          console.log(`  ✅ Created lead: ${result.insertedId}\n`);

          // Update message with leadId
          await db.collection('whatsappmessages').updateOne(
            { _id: msg._id },
            { $set: { leadId: result.insertedId } }
          );
          fixed++;
        }
      } else {
        console.log(`Message ${msg._id.toString().substring(0, 8)}... ✅ OK (has valid lead)\n`);
        ok++;
      }
    }

    console.log('════════════════════════════════════════════════════');
    console.log('SUMMARY:\n');
    console.log(`✅ Already linked: ${ok}`);
    console.log(`🔧 Fixed/Created: ${fixed}`);
    console.log(`❌ Errors: ${errors}`);

    if (fixed > 0) {
      console.log(`\n✅ Fixed ${fixed} messages/leads!`);
      console.log('   Incoming messages should now be visible in admin panel.');
    } else if (ok > 0) {
      console.log('\n✅ All messages already properly linked!');
    } else {
      console.log('\n⚠️  No inbound messages found in last 24 hours.');
      console.log('   Send a new WhatsApp message to 9779006820 to test.');
    }

    await mongoose.disconnect();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', msg);
    process.exit(1);
  }
}

fixIncomingMessages();
