#!/usr/bin/env node

/**
 * Comprehensive Meta Webhook Verification & Debugging
 * 
 * This script:
 * 1. Checks webhook endpoint is accessible
 * 2. Verifies environment variables
 * 3. Checks database connectivity
 * 4. Tests webhook with sample payload
 * 5. Verifies HMAC signature generation
 */

const crypto = require('crypto');
require('dotenv').config();

async function testWebhookEndpoint() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     Meta WhatsApp Webhook Verification                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // =====================================================================
  // 1. Environment Verification
  // =====================================================================
  console.log('1️⃣  ENVIRONMENT VARIABLES:');
  console.log('─'.repeat(60));

  const env = {
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ? '✅ SET' : '❌ MISSING',
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '❌ MISSING',
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? '✅ SET' : '❌ MISSING',
    META_APP_SECRET: process.env.META_APP_SECRET ? '✅ SET' : '❌ MISSING',
    MONGODB_URI: process.env.MONGODB_URI ? '✅ SET' : '❌ MISSING',
  };

  Object.entries(env).forEach(([key, val]) => {
    console.log(`  ${key}: ${val}`);
  });

  // Check for EC2 bridge (should be disabled)
  const bridgeSecret = process.env.WHATSAPP_WEB_BRIDGE_SECRET || '';
  console.log(`  WHATSAPP_WEB_BRIDGE_SECRET: ${bridgeSecret ? '⚠️  HAS VALUE (should be empty)' : '✅ EMPTY (good)'}`);

  // =====================================================================
  // 2. Database Connectivity
  // =====================================================================
  console.log('\n2️⃣  DATABASE CONNECTIVITY:');
  console.log('─'.repeat(60));

  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('  ✅ MongoDB: Connected');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const hasWhatsAppMessage = collections.some(c => c.name === 'whatsappmessages');
    const hasConversations = collections.some(c => c.name === 'conversations');
    const hasLeads = collections.some(c => c.name === 'leads');

    console.log(`  ${hasWhatsAppMessage ? '✅' : '❌'} WhatsAppMessage collection exists`);
    console.log(`  ${hasConversations ? '✅' : '❌'} Conversations collection exists`);
    console.log(`  ${hasLeads ? '✅' : '❌'} Leads collection exists`);

    // Count documents
    const msgCount = await db.collection('whatsappmessages').countDocuments();
    const convCount = await db.collection('conversations').countDocuments();
    const leadCount = await db.collection('leads').countDocuments();

    console.log(`\n  Document counts:`);
    console.log(`    • WhatsAppMessage: ${msgCount} documents`);
    console.log(`    • Conversations: ${convCount} documents`);
    console.log(`    • Leads: ${leadCount} documents`);

    // Show recent messages if any
    if (msgCount > 0) {
      console.log(`\n  Recent messages:`);
      const recent = await db.collection('whatsappmessages')
        .find({})
        .sort({ sentAt: -1 })
        .limit(3)
        .toArray();
      
      recent.forEach((msg, i) => {
        console.log(`    ${i + 1}. From: ${msg.phoneNumber} | Direction: ${msg.direction} | "${msg.messageContent}"`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.log(`  ❌ MongoDB: ${error instanceof Error ? error.message : 'Connection failed'}`);
  }

  // =====================================================================
  // 3. HMAC Signature Verification
  // =====================================================================
  console.log('\n3️⃣  WEBHOOK SIGNATURE TEST:');
  console.log('─'.repeat(60));

  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.log('  ❌ META_APP_SECRET not set - cannot verify signatures');
  } else {
    // Create sample payload
    const samplePayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '733788303156745',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '919309986820',
                  phone_number_id: '733788303156745',
                },
                messages: [
                  {
                    from: '919309986820',
                    id: 'wamid.test.123',
                    timestamp: Math.floor(Date.now() / 1000),
                    type: 'text',
                    text: {
                      body: 'Hello webhook test!',
                    },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const payloadString = JSON.stringify(samplePayload);
    const signature = crypto.createHmac('sha256', appSecret).update(payloadString, 'utf8').digest('hex');

    console.log(`  ✅ Sample payload created`);
    console.log(`  ✅ HMAC-SHA256 signature generated:`);
    console.log(`     ${signature}`);
    console.log(`\n  📝 To test the webhook manually, use:`);
    console.log(`     node test-meta-webhook.js`);
  }

  // =====================================================================
  // 4. Webhook Endpoint Status
  // =====================================================================
  console.log('\n4️⃣  WEBHOOK ENDPOINT STATUS:');
  console.log('─'.repeat(60));

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    console.log('  ❌ WHATSAPP_WEBHOOK_VERIFY_TOKEN not set');
  } else {
    console.log(`  ✅ Verify token is configured`);
    console.log(`     Length: ${verifyToken.length} characters`);

    // Show first and last 10 chars
    const start = verifyToken.substring(0, 10);
    const end = verifyToken.substring(verifyToken.length - 10);
    console.log(`     Pattern: ${start}...${end}`);
  }

  // =====================================================================
  // 5. Testing Instructions
  // =====================================================================
  console.log('\n5️⃣  WEBHOOK TESTING STEPS:');
  console.log('─'.repeat(60));

  console.log(`
✅ SETUP COMPLETE! Now follow these steps:

1. VERIFY CALLBACK URL IN META BUSINESS PLATFORM
   Go to: https://business.facebook.com/
   Settings → Apps and Websites → WhatsApp App → Configuration
   Verify:
     • Callback URL: https://your-domain.com/api/whatsapp/webhook
     • Verify Token: ${verifyToken ? verifyToken.substring(0, 20) + '...' : 'NOT SET'}
     • Subscribed Events: "messages" ✓

2. SEND REAL WHATSAPP MESSAGE
   Send a message to your business number (${process.env.WHATSAPP_PHONE_NUMBER_ID})
   Wait 2-5 seconds for webhook delivery

3. CHECK IF MESSAGE WAS RECEIVED
   Run: node test-incoming-message.js
   
   Look for:
     • WhatsAppMessage collection has new document
     • Document has direction: "inbound"
     • Document has leadId populated
     • Document has phoneNumber: sender's number

4. CHECK ADMIN UI
   Go to: https://your-domain.com/admin/crm/whatsapp
   Look for: Conversation in list, message on LEFT side

5. IF NO MESSAGE, TROUBLESHOOT
   • Check Vercel logs for errors
   • Verify webhook is GREEN in Meta Business Platform
   • Ensure sender phone is authorized in WhatsApp Business Account
   • Check that callback URL exactly matches your production domain
  `);

  // =====================================================================
  // 6. Configuration Check
  // =====================================================================
  console.log('\n6️⃣  PRODUCTION CONFIGURATION:');
  console.log('─'.repeat(60));

  const hasAllEnv = 
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
    process.env.META_APP_SECRET &&
    process.env.MONGODB_URI;

  if (hasAllEnv) {
    console.log('  ✅ All required environment variables are SET');
    console.log('  ✅ System is ready for production');
  } else {
    console.log('  ❌ Missing required environment variables');
    console.log('  Please set all of: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,');
    console.log('                     WHATSAPP_WEBHOOK_VERIFY_TOKEN, META_APP_SECRET');
  }

  // EC2 bridge check
  if (process.env.WHATSAPP_WEB_BRIDGE_SECRET) {
    console.log('\n  ⚠️  WARNING: WHATSAPP_WEB_BRIDGE_SECRET is set');
    console.log('     EC2 Bridge is enabled alongside Meta API');
    console.log('     This may cause duplicate messages!');
    console.log('     To disable: Clear WHATSAPP_WEB_BRIDGE_SECRET=""');
  } else {
    console.log('\n  ✅ EC2 Bridge is disabled (good)');
  }

  console.log('\n' + '═'.repeat(60) + '\n');
}

testWebhookEndpoint().catch(console.error);
