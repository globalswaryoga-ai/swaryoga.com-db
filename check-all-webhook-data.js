#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const MAIN_DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

async function checkAllWebhookData() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: MAIN_DB_NAME,
      tls: true,
      retryWrites: true,
    });

    const db = mongoose.connection;

    // Check WhatsAppWebhookEvent collection
    const webhookEventCount = await db.collection('whatsappwebhookevents').countDocuments();
    const messageCount = await db.collection('whatsappmessages').countDocuments();
    const leadCount = await db.collection('leads').countDocuments();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║            DATABASE COLLECTION COUNTS                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`WhatsAppWebhookEvent: ${webhookEventCount} documents`);
    console.log(`WhatsAppMessage: ${messageCount} documents`);
    console.log(`Lead: ${leadCount} documents\n`);

    if (webhookEventCount === 0 && messageCount === 0) {
      console.log('🔴 PROBLEM IDENTIFIED:\n');
      console.log('  - NO webhook events in database');
      console.log('  - NO messages in database');
      console.log('  - NO leads in database\n');
      console.log('This means the webhook is NOT processing anything.\n');
      console.log('Possible causes:');
      console.log('  1. Meta is not sending POST requests to webhook');
      console.log('  2. Database connection is failing in webhook');
      console.log('  3. Webhook code is crashing silently\n');
    }

    // Try to manually insert a test record to verify DB connection works
    console.log('Testing database write access...\n');
    
    const testId = new mongoose.Types.ObjectId();
    await db.collection('whatsappwebhookevents').insertOne({
      _id: testId,
      source: 'test-manual',
      kind: 'test',
      ok: true,
      message: 'Manual test insert at ' + new Date().toISOString(),
      receivedAt: new Date(),
    });

    console.log('✅ Successfully wrote test record to database\n');
    console.log('Next step: Check if webhook can process incoming messages\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAllWebhookData();
