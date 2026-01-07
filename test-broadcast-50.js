#!/usr/bin/env node

/**
 * Test script to verify broadcast message sending to 50 people
 * 
 * Usage: node test-broadcast-50.js
 * 
 * This script will:
 * 1. Connect to the database
 * 2. Fetch 50 leads
 * 3. Create a broadcast run with these leads
 * 4. Trigger the broadcast processor
 * 5. Report on results
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const CRON_SECRET = process.env.CRON_SECRET;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set in environment');
  process.exit(1);
}

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET not set in environment (needed for broadcast processing)');
  process.exit(1);
}

async function testBroadcast50() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: process.env.MONGODB_MAIN_DB_NAME || 'swar_yoga' });
    console.log('✅ Connected to MongoDB\n');

    // Import models after connection
    const { Lead, WhatsAppTemplate, BroadcastRun, BroadcastRunMessage } = require('./lib/db');

    console.log('📊 Fetching 50 leads for test...');
    const leads = await Lead.find({})
      .select({ _id: 1, name: 1, phoneNumber: 1, status: 1, workshopName: 1 })
      .limit(50)
      .lean();

    if (leads.length === 0) {
      console.error('❌ No leads found in database');
      process.exit(1);
    }

    console.log(`✅ Found ${leads.length} leads\n`);

    // Show sample leads
    console.log('📋 Sample leads:');
    leads.slice(0, 5).forEach((lead, idx) => {
      console.log(`  ${idx + 1}. ${lead.name || 'Unnamed'} - ${lead.phoneNumber}`);
    });
    console.log(`  ... and ${Math.max(0, leads.length - 5)} more\n`);

    // Fetch a template
    console.log('🔍 Fetching a template...');
    const template = await WhatsAppTemplate.findOne({ status: 'APPROVED' }).lean();

    if (!template) {
      console.error('❌ No approved template found');
      console.log('Please create and approve a template first');
      process.exit(1);
    }

    console.log(`✅ Using template: "${template.templateName}"\n`);

    // Create broadcast run
    console.log('📢 Creating broadcast run...');
    const run = await BroadcastRun.create({
      name: `Test Broadcast to ${leads.length} leads - ${new Date().toLocaleString()}`,
      createdByUserId: 'test-admin',
      createdByLabel: 'Test Admin',
      mode: 'now',
      status: 'draft',
      templateId: template._id,
      templateSnapshot: {
        templateName: template.templateName,
        language: template.language,
        headerMedia: template.headerMedia || null,
        buttons: template.buttons || [],
        templateContent: template.templateContent,
      },
      target: {
        type: 'leadIds',
        leadIds: leads.map(l => l._id.toString()),
      },
      stats: {
        total: leads.length,
        pending: leads.length,
        sent: 0,
        failed: 0,
        skipped: 0,
      },
    });

    console.log(`✅ Broadcast run created: ${run._id}\n`);

    // Create broadcast messages
    console.log('📨 Creating broadcast messages...');
    const messages = leads
      .filter(l => l.phoneNumber && String(l.phoneNumber).trim())
      .map(l => ({
        runId: run._id,
        leadId: l._id,
        phoneNumber: String(l.phoneNumber).trim(),
        status: 'pending',
      }));

    await BroadcastRunMessage.insertMany(messages);
    console.log(`✅ Created ${messages.length} broadcast messages\n`);

    // Process the broadcast
    console.log('🚀 Processing broadcast run...');
    console.log('   (This will actually send messages via WhatsApp)\n');

    const { processDueBroadcastRuns } = require('./lib/broadcastRuns');
    
    const result = await processDueBroadcastRuns({
      runLimit: 1,
      perRunMessageLimit: 50,
    });

    console.log('✅ Broadcast processing completed\n');
    console.log('📊 Results:');
    console.log(`   Scanned runs: ${result.scannedRuns}`);
    console.log(`   Executed runs: ${result.executedRuns}`);
    console.log(`   Attempted: ${result.attempted}`);
    console.log(`   Sent: ${result.sent}`);
    console.log(`   Failed: ${result.failed}`);
    console.log(`   Skipped: ${result.skipped}\n`);

    if (result.runResults.length > 0) {
      const runResult = result.runResults[0];
      console.log('📈 Run Details:');
      console.log(`   Run ID: ${runResult.runId}`);
      console.log(`   Status: ${runResult.status}`);
      console.log(`   Sent: ${runResult.sent}/${result.attempted}`);
      if (runResult.error) {
        console.log(`   Error: ${runResult.error}`);
      }
    }

    // Fetch final run stats
    const finalRun = await BroadcastRun.findById(run._id).lean();
    console.log('\n📊 Final Run Statistics:');
    console.log(`   Total: ${finalRun.stats.total}`);
    console.log(`   Pending: ${finalRun.stats.pending}`);
    console.log(`   Sent: ${finalRun.stats.sent}`);
    console.log(`   Failed: ${finalRun.stats.failed}`);
    console.log(`   Skipped: ${finalRun.stats.skipped}`);
    console.log(`   Status: ${finalRun.status}\n`);

    if (result.sent > 0) {
      console.log(`✅ SUCCESS! Sent messages to ${result.sent} people out of ${leads.length}`);
    } else if (result.attempted > 0) {
      console.log('⚠️  Messages were attempted but none sent successfully');
    } else {
      console.log('❌ No messages were sent');
    }

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testBroadcast50();
