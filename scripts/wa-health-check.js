#!/usr/bin/env node
/**
 * WhatsApp Health Check Script
 * Checks: Meta API token, QR Bridge, Webhook events in DB
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const CRM_DB = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WA_BUSINESS_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || 'http://52.91.198.23:3333';

async function main() {
  console.log('\n=== WHATSAPP HEALTH REPORT ===\n');
  console.log('Date:', new Date().toISOString());
  console.log('');

  // 1. Environment Vars
  console.log('--- 1. ENVIRONMENT VARIABLES ---');
  console.log('  WHATSAPP_ACCESS_TOKEN:', WA_TOKEN ? `SET (${WA_TOKEN.length} chars)` : 'NOT SET');
  console.log('  WHATSAPP_PHONE_NUMBER_ID:', WA_PHONE_ID || 'NOT SET');
  console.log('  WHATSAPP_BUSINESS_ACCOUNT_ID:', WA_BUSINESS_ID || 'NOT SET');
  console.log('  WHATSAPP_WEBHOOK_VERIFY_TOKEN:', process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? 'SET' : 'NOT SET');
  console.log('  BRIDGE_URL:', BRIDGE_URL);
  console.log('  BRIDGE_SECRET:', process.env.WHATSAPP_BRIDGE_SECRET ? 'SET' : 'NOT SET');
  console.log('');

  // 2. Meta API Token Check
  console.log('--- 2. META API TOKEN CHECK ---');
  try {
    const resp = await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID}?access_token=${WA_TOKEN}`);
    const data = await resp.json();
    if (data.error) {
      console.log('  STATUS: INVALID');
      console.log('  Error:', data.error.message);
      console.log('  Type:', data.error.type);
    } else {
      console.log('  STATUS: VALID');
      console.log('  Phone:', data.display_phone_number || data.verified_name || JSON.stringify(data).substring(0, 100));
    }
  } catch (e) {
    console.log('  STATUS: ERROR -', e.message);
  }
  console.log('');

  // 3. QR Bridge Check
  console.log('--- 3. QR BRIDGE CHECK ---');
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`${BRIDGE_URL}/status`, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await resp.json();
    console.log('  STATUS: REACHABLE (HTTP', resp.status + ')');
    console.log('  Response:', JSON.stringify(data).substring(0, 200));
  } catch (e) {
    if (e.name === 'AbortError' || e.message.includes('timeout') || e.cause?.code === 'ECONNREFUSED' || e.cause?.code === 'ETIMEDOUT') {
      console.log('  STATUS: UNREACHABLE (Connection timeout/refused)');
      console.log('  The EC2 bridge at', BRIDGE_URL, 'is DOWN');
    } else {
      console.log('  STATUS: ERROR -', e.message);
    }
  }
  console.log('');

  // 4. Database Check
  console.log('--- 4. DATABASE CHECK ---');
  let client;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    const crmDb = client.db(CRM_DB);

    // Webhook events
    const webhookEvents = crmDb.collection('whatsapp_webhook_events');
    const totalEvents = await webhookEvents.countDocuments();
    const recentEvents = await webhookEvents.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    const latestEvent = await webhookEvents.findOne({}, { sort: { createdAt: -1 } });
    console.log('  Webhook Events (total):', totalEvents);
    console.log('  Webhook Events (last 7 days):', recentEvents);
    console.log('  Latest Event:', latestEvent ? new Date(latestEvent.createdAt).toISOString() : 'None');
    if (latestEvent) {
      console.log('  Latest Kind:', latestEvent.kind || 'unknown');
    }

    // WhatsApp Messages
    const waMessages = crmDb.collection('whatsappmessages');
    const totalMsgs = await waMessages.countDocuments();
    const recentMsgs = await waMessages.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    const latestMsg = await waMessages.findOne({}, { sort: { createdAt: -1 } });
    console.log('');
    console.log('  WhatsApp Messages (total):', totalMsgs);
    console.log('  WhatsApp Messages (last 7 days):', recentMsgs);
    console.log('  Latest Message:', latestMsg ? new Date(latestMsg.createdAt).toISOString() : 'None');
    if (latestMsg) {
      console.log('  Latest Direction:', latestMsg.direction || 'unknown');
      console.log('  Latest Provider:', latestMsg.provider || 'unknown');
    }

    // QR Webhook Events
    const qrEvents = crmDb.collection('qr_webhook_events');
    const qrExists = await qrEvents.countDocuments();
    console.log('');
    console.log('  QR Webhook Events (total):', qrExists);
    if (qrExists > 0) {
      const latestQR = await qrEvents.findOne({}, { sort: { createdAt: -1 } });
      console.log('  Latest QR Event:', latestQR ? new Date(latestQR.createdAt).toISOString() : 'None');
    }

    // Broadcast messages
    const broadcasts = crmDb.collection('broadcastmessages');
    const bcExists = await broadcasts.estimatedDocumentCount();
    if (bcExists > 0) {
      const recentBC = await broadcasts.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      console.log('');
      console.log('  Broadcast Messages (total):', bcExists);
      console.log('  Broadcast Messages (last 7 days):', recentBC);
    }

  } catch (e) {
    console.log('  DATABASE ERROR:', e.message);
  } finally {
    if (client) await client.close();
  }
  console.log('');

  // 5. Summary
  console.log('--- 5. HEALTH SUMMARY ---');
  console.log('');
  console.log('  Meta API Token:', WA_TOKEN ? 'Configured' : 'MISSING');
  console.log('  Meta Webhook:', process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? 'Configured' : 'MISSING');
  console.log('  QR Bridge URL:', BRIDGE_URL);
  console.log('  QR Bridge Env Vars:', process.env.WHATSAPP_BRIDGE_HTTP_URL ? 'Active' : 'COMMENTED OUT (using fallback)');
  console.log('');
  console.log('=== END HEALTH REPORT ===\n');
}

main().catch(console.error);
