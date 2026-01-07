#!/usr/bin/env node

/**
 * Simple test to verify broadcast setup to 50 people
 * Uses direct MongoDB connection
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'swaryogaDB';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set');
  process.exit(1);
}

async function testBroadcast50() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected\n');

    const db = client.db(DB_NAME);

    // 1. Fetch 50 leads
    console.log('📊 Fetching 50 leads...');
    const leads = await db.collection('leads')
      .find({})
      .project({ _id: 1, name: 1, phoneNumber: 1, status: 1, workshopName: 1 })
      .limit(50)
      .toArray();

    if (leads.length === 0) {
      console.error('❌ No leads in database');
      console.log('\nTo test broadcasts:');
      console.log('  1. Go to /admin/crm/leads');
      console.log('  2. Upload leads via "Bulk Upload" button');
      console.log('  3. Run this script again');
      process.exit(1);
    }

    console.log(`✅ Found ${leads.length} leads\n`);

    // Show sample
    console.log('📋 Sample leads:');
    leads.slice(0, 3).forEach((lead, i) => {
      console.log(`   ${i+1}. ${lead.name || 'Unnamed'} (${lead.phoneNumber})`);
    });
    if (leads.length > 3) console.log(`   ... and ${leads.length - 3} more`);
    console.log();

    // 2. Check for template
    console.log('🔍 Checking for templates...');
    const template = await db.collection('whatsapptemplates').findOne({ status: 'APPROVED' });

    if (!template) {
      console.error('❌ No approved template found\n');
      console.log('To create a template:');
      console.log('  1. Go to /admin/crm/whatsapp/templates');
      console.log('  2. Click "Create Template"');
      console.log('  3. Fill in the form and submit');
      console.log('  4. Wait for Meta approval (check WhatsApp Business Account)');
      process.exit(1);
    }

    console.log(`✅ Template found: "${template.templateName}"\n`);

    // 3. Create broadcast run
    console.log('📢 Creating broadcast run...');
    const runResult = await db.collection('broadcastruns').insertOne({
      name: `Test to ${leads.length} people - ${new Date().toLocaleString()}`,
      createdByUserId: 'test',
      createdByLabel: 'Test',
      mode: 'now',
      status: 'draft',
      templateId: new ObjectId(template._id),
      templateSnapshot: {
        templateName: template.templateName,
        language: template.language,
        headerMedia: template.headerMedia || null,
        buttons: template.buttons || [],
        templateContent: template.templateContent,
      },
      target: { type: 'leadIds', leadIds: leads.map(l => l._id) },
      stats: { total: leads.length, pending: leads.length, sent: 0, failed: 0, skipped: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const runId = runResult.insertedId;
    console.log(`✅ Broadcast created: ${runId}\n`);

    // 4. Create messages
    console.log('📨 Creating messages...');
    const messages = leads
      .filter(l => l.phoneNumber)
      .map(l => ({
        runId,
        leadId: l._id,
        phoneNumber: String(l.phoneNumber).trim(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

    const msgResult = await db.collection('broadcastrunmessages').insertMany(messages);
    console.log(`✅ Created ${msgResult.insertedCount} messages\n`);

    // Summary
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  ✅ BROADCAST READY TO SEND               ║');
    console.log('╚════════════════════════════════════════════╝\n');

    console.log('📊 Details:');
    console.log(`   Leads: ${leads.length}`);
    console.log(`   Messages: ${msgResult.insertedCount}`);
    console.log(`   Template: ${template.templateName}`);
    console.log(`   Mode: Send Now`);
    console.log(`   Status: Draft\n`);

    console.log('🚀 To send messages now:\n');
    console.log('   Option 1 - Web UI:');
    console.log('     1. Go to /admin/crm/broadcast');
    console.log('     2. Select template');
    console.log('     3. Click "Send Broadcast Now"\n');

    console.log('   Option 2 - API Call:');
    console.log(`     curl -X POST http://localhost:3000/api/admin/crm/broadcast-runs/run \\`);
    console.log(`          -H "x-cron-secret: YOUR_CRON_SECRET"`);
    console.log(`          -H "Content-Type: application/json" \\`);
    console.log(`          -d '{"runLimit": 1, "perRunMessageLimit": 50}'\n`);

    console.log('   Option 3 - CLI Test:');
    console.log('     npm run test:broadcast\n');

    console.log('✨ WhatsApp will deliver messages to:');
    messages.forEach((msg, i) => {
      if (i < 3) {
        const lead = leads.find(l => l._id.equals(msg.leadId));
        console.log(`   ${i+1}. ${lead?.name || 'Unknown'} (${msg.phoneNumber})`);
      }
    });
    if (messages.length > 3) {
      console.log(`   ... and ${messages.length - 3} more`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

testBroadcast50();
