#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const MAIN_DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

async function checkWebhookEvents() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: MAIN_DB_NAME,
      tls: true,
      retryWrites: true,
    });

    const db = mongoose.connection;
    const WhatsAppWebhookEventSchema = new mongoose.Schema(
      {
        source: String,
        kind: String,
        ok: Boolean,
        message: String,
        phoneNumber: String,
        waMessageId: String,
        status: String,
        sample: mongoose.Schema.Types.Mixed,
        receivedAt: Date,
      },
      { collection: 'whatsappwebhookevents' }
    );

    const WhatsAppWebhookEvent = db.model('WhatsAppWebhookEvent', WhatsAppWebhookEventSchema);

    // Get last 10 webhook events
    const events = await WhatsAppWebhookEvent.find().sort({ receivedAt: -1 }).limit(10).lean();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║            RECENT WEBHOOK EVENTS (Last 10)                    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (events.length === 0) {
      console.log('❌ NO WEBHOOK EVENTS FOUND!\n');
      console.log('This means:');
      console.log('  - Meta is NOT sending messages to your webhook, OR');
      console.log('  - Webhook validation is failing before processing\n');
    } else {
      events.forEach((ev, i) => {
        console.log(`\n[${i + 1}] ${new Date(ev.receivedAt).toISOString()}`);
        console.log(`    Kind: ${ev.kind}`);
        console.log(`    OK: ${ev.ok}`);
        console.log(`    Message: ${ev.message}`);
        if (ev.phoneNumber) console.log(`    Phone: ${ev.phoneNumber}`);
        if (ev.status) console.log(`    Status: ${ev.status}`);
        if (ev.sample) console.log(`    Sample: ${JSON.stringify(ev.sample, null, 2)}`);
      });
    }

    // Also count by kind
    const counts = await WhatsAppWebhookEvent.aggregate([
      { $group: { _id: '$kind', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║              EVENT BREAKDOWN BY KIND                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    counts.forEach((c) => {
      console.log(`  ${c._id}: ${c.count}`);
    });

    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkWebhookEvents();
