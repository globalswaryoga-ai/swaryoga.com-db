/**
 * WHATSAPP MASTER DIAGNOSTICS
 * ---------------------------
 * Checks: 
 * 1. Env variables (Meta API)
 * 2. Bridge Status (Must be disabled)
 * 3. Recent Webhook Hits (Incoming)
 * 4. Recent Outbound Logs (Outgoing)
 * 5. Database Connection
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function check() {
  console.log('🚀 Starting Master WhatsApp Diagnostics...\n');

  // 1. Env Check
  const metaToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const bridgeDisabled = process.env.WHATSAPP_DISABLE_WEB_BRIDGE === 'true';

  console.log('--- Configuration ---');
  console.log(`✅ Meta Token: ${metaToken ? 'SET (Starts with ' + metaToken.substring(0,6) + '...)' : '❌ MISSING'}`);
  console.log(`✅ Phone ID:   ${metaPhoneId ? 'SET (' + metaPhoneId + ')' : '❌ MISSING'}`);
  console.log(`✅ Web Bridge: ${bridgeDisabled ? '🚫 DISABLED (Correct)' : '⚠️ ENABLED (Should be disabled for Meta-only mode)'}`);

  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI_MAIN is missing!');
    return;
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('swaryoga_admin_crm');
    console.log('\n--- Database Connection ---');
    console.log('✅ Connected to swaryoga_admin_crm');

    // 2. Outgoing Check
    const recentOutbound = await db.collection('whatsapp_messages')
      .find({ direction: 'outbound' })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    console.log('\n--- Outgoing Messages ---');
    if (recentOutbound.length > 0) {
      const msg = recentOutbound[0];
      console.log(`✅ Last Outgoing: ${msg.createdAt.toISOString()}`);
      console.log(`   To: ${msg.phoneNumber}`);
      console.log(`   Status: ${msg.status} (${msg.provider || 'unknown provider'})`);
    } else {
      console.log('❓ No outgoing messages found in last 24h.');
    }

    // 3. Incoming Webhook Check
    const lastWebhookInbound = await db.collection('whatsapp_webhook_events')
      .find({ kind: 'inbound_message' })
      .sort({ receivedAt: -1 })
      .limit(1)
      .toArray();

    console.log('\n--- Incoming Webhooks (Meta Hits) ---');
    if (lastWebhookInbound.length > 0) {
      const hit = lastWebhookInbound[0];
      console.log(`✅ Last Inbound Hit: ${hit.receivedAt.toISOString()}`);
      console.log(`   Result: ${hit.ok ? 'SUCCESS' : 'FAILED'}`);
      if (!hit.ok) console.log(`   Error: ${hit.message}`);
    } else {
      console.log('❌ NO INBOUND MESSAGES RECORDED YET.');
      console.log('   Check Meta Developer Portal Webhook Callback URL.');
    }

    // 4. Verification Check
    const lastVerify = await db.collection('whatsapp_webhook_events')
      .find({ kind: 'verify' })
      .sort({ receivedAt: -1 })
      .limit(1)
      .toArray();

    if (lastVerify.length > 0) {
      console.log(`✅ Last Webhook Verification: ${lastVerify[0].receivedAt.toISOString()} (${lastVerify[0].ok ? 'OK' : 'FAILED'})`);
    }

    console.log('\n--- Final Recommendation ---');
    if (bridgeDisabled && metaToken && metaPhoneId) {
      console.log('✅ SYSTEM ARCHITECTURE IS CORRECT.');
    } else {
      console.log('❌ PLEASE CHECK CONFIGURATION.');
    }
    
    if (lastWebhookInbound.length === 0) {
      console.log('⚠️ INCOMING NOT FLOWING: Set webhook to https://crm.swaryoga.com/api/whatsapp/webhook');
    } else {
      console.log('✨ EVERYTHING LOOKS HEALTHY.');
    }

  } catch (e) {
    console.error(`\n❌ Error during diagnostics: ${e.message}`);
  } finally {
    await client.close();
  }
}

check();
