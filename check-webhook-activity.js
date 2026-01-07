#!/usr/bin/env node

/**
 * CHECK: Verify webhook has been called recently
 * Look for logs, traces, or database writes from incoming messages
 */

const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function checkWebhookActivity() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   CHECK: Recent Webhook Activity                   ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not set in .env');
      return;
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected!\n');

    const db = mongoose.connection.db;

    // Check 1: Recent incoming messages
    console.log('📊 CHECK 1: Recent incoming messages (last 24 hours)');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMessages = await db
      .collection('whatsappmessages')
      .find({
        direction: 'inbound',
        createdAt: { $gte: twentyFourHoursAgo },
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    console.log(`  Found ${recentMessages.length} incoming messages\n`);
    if (recentMessages.length > 0) {
      console.log('  Latest message:');
      const msg = recentMessages[0];
      console.log(`    From: ${msg.phoneNumber}`);
      console.log(`    Content: ${msg.messageContent?.substring(0, 50) || '(no content)'}`);
      console.log(`    Time: ${msg.createdAt}`);
    } else {
      console.log('  ❌ NO incoming messages found in last 24 hours\n');
    }

    // Check 2: Webhook test logs
    console.log('\n📊 CHECK 2: Webhook test events (system_webhook_tests)');
    const testLogs = await db
      .collection('system_webhook_tests')
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    console.log(`  Found ${testLogs.length} test logs\n`);
    if (testLogs.length > 0) {
      console.log('  Latest test log:');
      const log = testLogs[0];
      console.log(`    Stage: ${log.stage}`);
      console.log(`    Time: ${log.timestamp}`);
      console.log(`    DB: ${log.mainDbName}`);
    }

    // Check 3: Webhook event logs
    console.log('\n📊 CHECK 3: Webhook event logs (WhatsAppWebhookEvent)');
    const eventLogs = await db
      .collection('whatsappwebhookevents')
      .find({})
      .sort({ receivedAt: -1 })
      .limit(10)
      .toArray();

    console.log(`  Found ${eventLogs.length} event logs\n`);
    if (eventLogs.length > 0) {
      console.log('  Latest events:');
      eventLogs.slice(0, 3).forEach((log, i) => {
        console.log(`    ${i + 1}. ${log.kind} - ${log.message} (${log.receivedAt})`);
      });
    }

    // Check 4: Leads with 9779006820
    console.log('\n📊 CHECK 4: Leads with phone 9779006820');
    const leads = await db
      .collection('leads')
      .find({ phone: '9779006820' })
      .limit(5)
      .toArray();

    console.log(`  Found ${leads.length} leads\n`);
    if (leads.length > 0) {
      const lead = leads[0];
      console.log('  First lead:');
      console.log(`    Name: ${lead.name || '(unnamed)'}`);
      console.log(`    Phone: ${lead.phone}`);
      console.log(`    Created: ${lead.createdAt}`);
    }

    // Summary
    console.log('\n════════════════════════════════════════════════════');
    console.log('DIAGNOSIS:\n');

    if (recentMessages.length === 0) {
      console.log('❌ PROBLEM: No incoming messages in database');
      console.log('   This means either:');
      console.log('   1. Meta is NOT sending webhook to our endpoint');
      console.log('   2. Webhook is being called but failing to save\n');
      console.log('NEXT STEPS:');
      console.log('1. Check Vercel logs to see if POST requests are arriving');
      console.log('2. Verify Meta webhook subscription is working');
      console.log('3. Check webhook fields (messages, message_status) are subscribed');
    } else {
      console.log('✅ GOOD: Incoming messages are being saved!');
      console.log('   The webhook is working and messages are persisting.\n');
    }

    if (testLogs.length > 0) {
      console.log('✅ System logs show webhook code IS executing');
    } else {
      console.log('❌ No system logs - webhook may not be called at all');
    }

    await mongoose.disconnect();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', msg);
  }
}

checkWebhookActivity();
