#!/usr/bin/env node

/**
 * DIAGNOSTIC SCRIPT: Check both Meta and QR WhatsApp systems
 * Identifies connection, message, and webhook issues
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI_MAIN || '';
const CRM_DB = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || '';
const META_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const QR_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || '';

async function checkMeta() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 META CLOUD API CHECK');
  console.log('='.repeat(60));

  // Check env vars
  console.log('\n1️⃣  ENVIRONMENT VARIABLES');
  console.log('   Access Token:', META_TOKEN ? `✅ SET (${META_TOKEN.substring(0, 20)}...)` : '❌ MISSING');
  console.log('   Webhook Token:', process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? '✅ SET' : '❌ MISSING');

  // Check webhook endpoint
  console.log('\n2️⃣  WEBHOOK ENDPOINT');
  try {
    const webhookUrl = 'https://crm.swaryoga.com/api/whatsapp/webhook?debug=1';
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'Diagnostic-Script' }
    });
    console.log(`   GET /api/whatsapp/webhook: ${response.status}`);
    if (response.status === 403) console.log('   ✅ Webhook is responding to GET (webhook verification ready)');
    else if (response.status === 500) console.log('   ⚠️  Webhook returning 500 (env var issue?)');
    else console.log(`   ⚠️  Unexpected status: ${response.status}`);
  } catch (err) {
    console.log('   ❌ Webhook unreachable:', err instanceof Error ? err.message : String(err));
  }

  // Check inbound messages
  console.log('\n3️⃣  INBOUND MESSAGES (Last 24h)');
  try {
    const db = mongoose.connection.useDb(CRM_DB);
    const collection = db.collection('whatsapp_messages');
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const inbound = await collection.countDocuments({
      direction: 'inbound',
      provider: 'meta',
      createdAt: { $gte: oneDayAgo }
    });
    
    const all = await collection.countDocuments({
      direction: 'inbound',
      provider: 'meta'
    });

    console.log(`   Last 24h: ${inbound} messages`);
    console.log(`   All time: ${all} messages`);
    
    if (inbound === 0 && all > 0) {
      console.log('   ⚠️  No recent inbound messages - webhook may not be receiving events');
    } else if (inbound > 0) {
      console.log('   ✅ Recent inbound messages found');
    } else {
      console.log('   ❌ No inbound messages at all - check webhook configuration');
    }

    // Check webhook events
    const webhookCollection = db.collection('whatsapp_webhook_events');
    const webhookEvents = await webhookCollection.countDocuments({
      source: 'meta',
      createdAt: { $gte: oneDayAgo }
    });

    console.log(`\n4️⃣  WEBHOOK EVENTS (Last 24h)`);
    console.log(`   Total events: ${webhookEvents}`);
    
    if (webhookEvents === 0) {
      console.log('   ❌ No webhook events recorded - webhook endpoint not being called by Meta');
      console.log('   ⚠️  Check: Meta Dashboard → WhatsApp → Configuration → Webhook');
    } else {
      console.log('   ✅ Webhook events are being received');
    }
  } catch (err) {
    console.log('   ❌ Database error:', err instanceof Error ? err.message : String(err));
  }
}

async function checkQR() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 QR WHATSAPP BRIDGE CHECK');
  console.log('='.repeat(60));

  // Check env vars
  console.log('\n1️⃣  ENVIRONMENT VARIABLES');
  console.log('   Bridge URL:', BRIDGE_URL ? `✅ SET (${BRIDGE_URL})` : '❌ MISSING');
  console.log('   Bridge Secret:', QR_SECRET ? '✅ SET' : '❌ MISSING');

  // Check bridge connection
  console.log('\n2️⃣  BRIDGE STATUS ENDPOINT');
  try {
    const response = await fetch(`${BRIDGE_URL}/status`, {
      method: 'GET',
      timeout: 5000
    }).catch(err => {
      throw new Error(`Network error: ${err.message}`);
    });

    const status = response.status;
    console.log(`   GET ${BRIDGE_URL}/status: ${status}`);

    if (status === 200) {
      const data = await response.json();
      console.log('   ✅ Bridge is CONNECTED');
      console.log('   Status:', data.status);
      if (data.qr) console.log('   🔲 QR code available');
    } else if (status === 404) {
      console.log('   ❌ Bridge endpoint not found (404)');
      console.log('   ⚠️  Check bridge service is running at:', BRIDGE_URL);
    } else if (status === 503 || status === 500) {
      console.log('   ⚠️  Bridge returned error status:', status);
    } else {
      console.log('   ⚠️  Unexpected status:', status);
    }
  } catch (err) {
    console.log('   ❌ Cannot reach bridge:', err instanceof Error ? err.message : String(err));
    console.log('   ⚠️  Troubleshooting:');
    console.log('      1. Verify bridge URL is correct:', BRIDGE_URL);
    console.log('      2. Check if bridge service is running');
    console.log('      3. Verify firewall/network allows connection');
  }

  // Check QR messages
  console.log('\n3️⃣  QR INBOUND MESSAGES (Last 24h)');
  try {
    const db = mongoose.connection.useDb(CRM_DB);
    const collection = db.collection('whatsapp_messages');
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const inbound = await collection.countDocuments({
      direction: 'inbound',
      provider: 'whatsapp_qr',
      createdAt: { $gte: oneDayAgo }
    });
    
    const all = await collection.countDocuments({
      direction: 'inbound',
      provider: 'whatsapp_qr'
    });

    console.log(`   Last 24h: ${inbound} messages`);
    console.log(`   All time: ${all} messages`);
    
    if (all === 0) {
      console.log('   ℹ️  QR system not yet active (expected if not configured)');
    } else if (inbound === 0) {
      console.log('   ⚠️  No recent messages - check if QR is still connected');
    } else {
      console.log('   ✅ Recent QR messages found');
    }
  } catch (err) {
    console.log('   ❌ Database error:', err instanceof Error ? err.message : String(err));
  }

  // Check QR webhook events
  console.log('\n4️⃣  QR WEBHOOK EVENTS (Last 24h)');
  try {
    const db = mongoose.connection.useDb(CRM_DB);
    const webhookCollection = db.collection('whatsapp_webhook_events');
    const webhookEvents = await webhookCollection.countDocuments({
      source: 'qr',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    console.log(`   Total events: ${webhookEvents}`);
    
    if (webhookEvents === 0) {
      console.log('   ℹ️  No QR webhook events (expected if QR not configured)');
    } else {
      console.log('   ✅ QR webhook events are being received');
    }
  } catch (err) {
    console.log('   ❌ Database error:', err instanceof Error ? err.message : String(err));
  }
}

async function checkConnections() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 DATABASE & SYSTEM CONNECTIVITY');
  console.log('='.repeat(60));

  console.log('\n1️⃣  MONGODB CONNECTION');
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('   ✅ MongoDB connected');
      console.log('   Database:', MONGODB_URI.split('/').pop()?.split('?')[0]);
    } else {
      console.log('   ⚠️  MongoDB disconnected, connecting...');
      await mongoose.connect(MONGODB_URI);
      console.log('   ✅ MongoDB connected');
    }
  } catch (err) {
    console.log('   ❌ MongoDB connection error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  console.log('\n2️⃣  CRM DATABASE');
  try {
    const db = mongoose.connection.useDb(CRM_DB);
    const collections = await db.listCollections();
    console.log(`   ✅ Database connected: ${CRM_DB}`);
    console.log(`   Collections: ${collections.length}`);
    
    // Count messages
    const msgCount = await db.collection('whatsapp_messages').countDocuments();
    const eventCount = await db.collection('whatsapp_webhook_events').countDocuments();
    console.log(`      - whatsapp_messages: ${msgCount} docs`);
    console.log(`      - whatsapp_webhook_events: ${eventCount} docs`);
  } catch (err) {
    console.log('   ❌ CRM database error:', err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  console.log('\n🚀 WhatsApp CRM Diagnostic Report');
  console.log('Generated:', new Date().toLocaleString());

  try {
    await checkConnections();
    await checkMeta();
    await checkQR();

    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));

    console.log('\n✅ Meta Cloud API:');
    console.log('   - Check webhook is verified in Meta Dashboard');
    console.log('   - Verify callback URL matches production domain');
    console.log('   - Confirm WHATSAPP_WEBHOOK_VERIFY_TOKEN is set');

    console.log('\n✅ QR WhatsApp:');
    console.log('   - If not using QR, this is normal (fallback system)');
    console.log('   - If using QR: verify bridge service is running');
    console.log('   - Check WHATSAPP_BRIDGE_HTTP_URL and WHATSAPP_BRIDGE_SECRET');

    console.log('\n📞 TROUBLESHOOTING NEXT STEPS:');
    console.log('   1. Meta inbound not working → Check webhook verification');
    console.log('   2. QR not connecting → Verify bridge URL and secret');
    console.log('   3. Both not working → Review environment variables');

  } catch (err) {
    console.error('\n❌ Fatal error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n');
  }
}

main();
