#!/usr/bin/env node

/**
 * Test script to verify incoming WhatsApp messages are being received
 * and stored in the database correctly
 *
 * Usage:
 *   node test-incoming-message.js          # Check current state
 *   node test-incoming-message.js --clear  # Clear test messages
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     Testing Meta Incoming WhatsApp Messages                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not set in .env');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // =====================================================================
    // 1. Check WhatsAppMessage collection
    // =====================================================================
    console.log('📨 WhatsAppMessage Collection Status:');
    console.log('─'.repeat(60));

    const messages = await db.collection('whatsappmessages').find({}).toArray();
    console.log(`Total messages: ${messages.length}`);

    if (messages.length > 0) {
      console.log('\nRecent messages:');
      messages.slice(-5).forEach((msg, i) => {
        console.log(`\n  ${i + 1}. From: ${msg.from}`);
        console.log(`     To: ${msg.to}`);
        console.log(`     Direction: ${msg.direction}`);
        console.log(`     Body: ${msg.body}`);
        console.log(`     Timestamp: ${msg.timestamp}`);
        console.log(`     Message ID: ${msg.waMessageId}`);
      });
    } else {
      console.log('❌ No messages found in collection');
      console.log('   Expected: Messages should appear here after sending WhatsApp message');
    }

    // =====================================================================
    // 2. Check Conversations collection
    // =====================================================================
    console.log('\n\n📞 Conversations Collection Status:');
    console.log('─'.repeat(60));

    const conversations = await db
      .collection('conversations')
      .find({})
      .toArray();
    console.log(`Total conversations: ${conversations.length}`);

    if (conversations.length > 0) {
      console.log('\nConversations:');
      conversations.forEach((conv, i) => {
        console.log(`\n  ${i + 1}. Participant: ${conv.participantPhoneNumber}`);
        console.log(`     Last message: ${conv.lastMessage?.body || 'N/A'}`);
        console.log(`     Updated: ${conv.updatedAt}`);
      });
    } else {
      console.log('❌ No conversations found');
      console.log('   Expected: Conversations should be created when messages arrive');
    }

    // =====================================================================
    // 3. Configuration Summary
    // =====================================================================
    console.log('\n\n⚙️  Webhook Configuration:');
    console.log('─'.repeat(60));

    const config = {
      'WHATSAPP_ACCESS_TOKEN': process.env.WHATSAPP_ACCESS_TOKEN ? '✅ SET' : '❌ MISSING',
      'WHATSAPP_PHONE_NUMBER_ID': process.env.WHATSAPP_PHONE_NUMBER_ID || '❌ MISSING',
      'WHATSAPP_WEBHOOK_VERIFY_TOKEN': process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? '✅ SET' : '❌ MISSING',
      'META_APP_SECRET': process.env.META_APP_SECRET ? '✅ SET' : '❌ MISSING',
      'WHATSAPP_WEB_BRIDGE_SECRET': process.env.WHATSAPP_WEB_BRIDGE_SECRET || '❌ EMPTY (good)',
    };

    Object.entries(config).forEach(([key, val]) => {
      console.log(`${key}: ${val}`);
    });

    // =====================================================================
    // 4. Test Instructions
    // =====================================================================
    console.log('\n\n📋 Testing Instructions:');
    console.log('─'.repeat(60));

    console.log(`
1. SEND MESSAGE:
   Send a WhatsApp message to your business number
   Phone ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID || 'NOT SET'}

2. WAIT 2-5 SECONDS:
   Meta needs time to deliver the webhook

3. RUN THIS SCRIPT AGAIN:
   node test-incoming-message.js
   (You should see your message in the output)

4. CHECK ADMIN UI:
   Go to: https://your-domain.com/admin/crm/whatsapp
   You should see:
   ✓ Conversation in list
   ✓ Message in chat thread
   ✓ Message on LEFT side (incoming)
    `);

    // =====================================================================
    // 5. Troubleshooting
    // =====================================================================
    if (messages.length === 0) {
      console.log('\n\n🔧 No Messages? Try These Steps:');
      console.log('─'.repeat(60));
      console.log(`
1. Verify webhook in Meta Business Platform:
   https://business.facebook.com/
   → Settings → Apps and Websites
   → WhatsApp App → Configuration
   → Check Webhook Settings

2. Check that callback URL matches:
   https://your-domain.com/api/whatsapp/webhook

3. Verify Token matches:
   ${process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'NOT SET'}

4. Ensure "messages" event is subscribed

5. Check Vercel/deployment logs for errors:
   https://vercel.com/dashboard

6. Verify your business phone number is authorized
   in Meta WhatsApp Business Account
      `);
    }

    console.log('\n' + '═'.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
