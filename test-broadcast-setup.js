#!/usr/bin/env node

/**
 * Test script to verify broadcast message setup and creation to 50 people
 * 
 * Usage: node test-broadcast-setup.js
 * 
 * This script will:
 * 1. Connect to the database
 * 2. Fetch 50 leads
 * 3. Create a broadcast run with these leads
 * 4. Create the message queue
 * 5. Report on setup
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set in environment');
  process.exit(1);
}

async function testBroadcastSetup() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.substring(0, 50)}...`);
    
    const mongoose = require('mongoose');
    await mongoose.connect(MONGODB_URI, { dbName: 'swaryogaDB' });
    console.log('✅ Connected to MongoDB\n');

    // Import models after connection
    const { default: connectDB } = await import('./lib/db.ts');
    const LeadModel = mongoose.model('Lead') || (await import('./lib/schemas/enterpriseSchemas.ts')).Lead;
    const TemplateModel = mongoose.model('WhatsAppTemplate') || (await import('./lib/schemas/enterpriseSchemas.ts')).WhatsAppTemplate;
    const BroadcastRunModel = mongoose.model('BroadcastRun') || (await import('./lib/schemas/enterpriseSchemas.ts')).BroadcastRun;
    const BroadcastRunMessageModel = mongoose.model('BroadcastRunMessage') || (await import('./lib/schemas/enterpriseSchemas.ts')).BroadcastRunMessage;

    console.log('📊 Fetching 50 leads for test...');
    const leads = await mongoose.connection.collection('leads').find({})
      .project({ _id: 1, name: 1, phoneNumber: 1, status: 1, workshopName: 1 })
      .limit(50)
      .toArray();

    if (leads.length === 0) {
      console.error('❌ No leads found in database');
      console.log('\nNote: Database may be empty. You can:');
      console.log('   1. Import leads via CSV upload in the admin panel');
      console.log('   2. Use a script to create test leads');
      process.exit(1);
    }

    console.log(`✅ Found ${leads.length} leads\n`);

    // Show sample leads
    console.log('📋 Sample leads:');
    leads.slice(0, 5).forEach((lead, idx) => {
      console.log(`  ${idx + 1}. ${lead.name || 'Unnamed'} - ${lead.phoneNumber}`);
    });
    if (leads.length > 5) {
      console.log(`  ... and ${leads.length - 5} more`);
    }
    console.log();

    // Check for templates
    console.log('🔍 Checking for approved templates...');
    const templates = await mongoose.connection.collection('whatsapptemplates').find({ status: 'APPROVED' }).limit(1).toArray();

    if (templates.length === 0) {
      console.log('⚠️  No approved templates found');
      console.log('\nYou need to:');
      console.log('   1. Create a template in /admin/crm/whatsapp/templates');
      console.log('   2. Submit it for approval with Meta');
      console.log('   3. Once approved, it will appear in broadcasts\n');
      process.exit(1);
    }

    const template = templates[0];
    console.log(`✅ Using template: "${template.templateName}"\n`);

    // Create broadcast run
    console.log('📢 Creating broadcast run...');
    const broadcastRuns = mongoose.connection.collection('broadcastruns');
    
    const run = await broadcastRuns.insertOne({
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
        leadIds: leads.map(l => l._id),
      },
      stats: {
        total: leads.length,
        pending: leads.length,
        sent: 0,
        failed: 0,
        skipped: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ Broadcast run created: ${run.insertedId}\n`);

    // Create broadcast messages
    console.log('📨 Creating broadcast messages...');
    const messages = leads
      .filter(l => l.phoneNumber && String(l.phoneNumber).trim())
      .map(l => ({
        runId: run.insertedId,
        leadId: l._id,
        phoneNumber: String(l.phoneNumber).trim(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

    const broadcastMessages = mongoose.connection.collection('broadcastrunmessages');
    const insertResult = await broadcastMessages.insertMany(messages);
    
    console.log(`✅ Created ${insertResult.insertedCount} broadcast messages\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ BROADCAST SETUP SUCCESSFUL');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📊 Summary:');
    console.log(`   Template: ${template.templateName}`);
    console.log(`   Leads selected: ${leads.length}`);
    console.log(`   Messages queued: ${insertResult.insertedCount}`);
    console.log(`   Broadcast Run ID: ${run.insertedId}`);
    console.log(`   Status: Draft (ready to send)\n`);

    console.log('🚀 Next Steps:');
    console.log(`   1. Go to /admin/crm/broadcast in the web UI`);
    console.log(`   2. The broadcast run will appear in the UI`);
    console.log(`   3. Click "Send Now" to send all ${insertResult.insertedCount} messages`);
    console.log(`   4. Monitor the progress in the broadcast stats\n`);

    console.log('📋 Broadcast Modes:');
    console.log('   • Send Now: Messages sent immediately (when cron runs)');
    console.log('   • Schedule: Send at a specific date/time');
    console.log('   • Delay: Send after a delay (days/hours/mins/secs)\n');

    // Show stats about phone numbers
    const validPhones = messages.length;
    const invalidPhones = leads.length - validPhones;
    
    console.log('📞 Phone Numbers:');
    console.log(`   Valid: ${validPhones}`);
    console.log(`   Invalid/Missing: ${invalidPhones}`);
    console.log(`   Success Rate: ${Math.round((validPhones / leads.length) * 100)}%\n`);

  } catch (error) {
    console.error('❌ Test failed with error:');
    console.error(error.message);
    process.exit(1);
  } finally {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the test
testBroadcastSetup();
