/**
 * SWAR YOGA - PRODUCTION HEALTH CHECK
 * Designed to verify all critical systems for Meta WhatsApp integration
 * Run this: node scripts/health-check-meta.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkHealth() {
  console.log('\n🔍 --- SWAR YOGA META WHATSAPP HEALTH AUDIT ---\n');

  // 1. Check ENV Vars
  const required = [
    'MONGODB_URI_MAIN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_ACCESS_TOKEN',
  ];
  
  const envResults = required.map(key => ({
    key,
    status: process.env[key] ? '✅ OK' : '❌ MISSING',
    masked: process.env[key] ? (key.includes('TOKEN') ? process.env[key].substring(0, 8) + '...' : process.env[key]) : '---'
  }));

  console.table(envResults);

  // Check Disable Flag
  const bridgeDisabled = process.env.WHATSAPP_DISABLE_WEB_BRIDGE === 'true';
  console.log(`\n🌉 Legacy Web Bridge Disabled: ${bridgeDisabled ? '✅ YES (Correct)' : '❌ NO (Will cause duplicates!)'}`);

  // 2. Connect to Database
  try {
    await mongoose.connect(process.env.MONGODB_URI_MAIN);
    console.log('📦 Database: ✅ Connected');

    const adminDb = mongoose.connection.useDb('swaryoga_admin_crm');
    
    // 3. Check Webhook Hits
    const lastWebhook = await adminDb.collection('whatsapp_webhook_events')
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (lastWebhook.length > 0) {
      const diff = (new Date() - new Date(lastWebhook[0].createdAt)) / (1000 * 60);
      console.log(`📡 Last Meta Webhook Hit: ${lastWebhook[0].createdAt.toISOString()} (${Math.round(diff)} mins ago)`);
      if (diff > 1440) console.log('⚠️ WARNING: No webhook activity in > 24 hours!');
    } else {
      console.log('❌ CRITICAL: No Meta webhooks ever logged!');
    }

    // 3b. Recent Raw Activity
    const rawHits = await adminDb.collection('whatsapp_webhook_events')
      .find({ message: 'RAW_POST_RECEIVED' })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    if (rawHits.length > 0) {
      console.log('\n🔍 RECENT RAW WEBHOOKS:');
      rawHits.forEach(h => {
        console.log(`  [${h.createdAt.toISOString()}] URL: ${h.sample?.url}`);
      });
    }

    // 4. Check Inbound Messages
    const lastInbound = await adminDb.collection('whatsapp_messages')
      .find({ direction: 'inbound', provider: 'meta' })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (lastInbound.length > 0) {
      console.log(`📥 Last Inbound (Meta): ${lastInbound[0].createdAt.toISOString()} from ${lastInbound[0].phoneNumber}`);
    } else {
      console.log('⚠️ No inbound Meta messages found in whatsapp_messages collection.');
    }

    // Window used for 24h counters
    const since = new Date(Date.now() - 86400000);

    // 5. Check Outbound Messages
    const lastOutbound = await adminDb.collection('whatsapp_messages')
      .find({ direction: 'outbound', provider: 'meta' })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (lastOutbound.length > 0) {
      console.log(
        `📤 Last Outbound (Meta): ${lastOutbound[0].createdAt.toISOString()} to ${lastOutbound[0].phoneNumber} ` +
        `[Status: ${lastOutbound[0].status}]` +
        (lastOutbound[0].waMessageId ? ` [waMessageId: ${String(lastOutbound[0].waMessageId).slice(0, 24)}...]` : '')
      );
    } else {
      console.log('⚠️ No outbound Meta messages found.');
    }

    // 5b) Outbound stats (Meta) last 24h
    const outSent24h = await adminDb.collection('whatsapp_messages')
      .countDocuments({ direction: 'outbound', provider: 'meta', status: 'sent', createdAt: { $gt: since } });
    const outFailed24h = await adminDb.collection('whatsapp_messages')
      .countDocuments({ direction: 'outbound', provider: 'meta', status: 'failed', createdAt: { $gt: since } });
    const outQueued24h = await adminDb.collection('whatsapp_messages')
      .countDocuments({ direction: 'outbound', provider: 'meta', status: { $in: ['queued', 'delayed'] }, createdAt: { $gt: since } });

    console.log(`📤 Outbound (Meta) last 24h: sent=${outSent24h}, queued/delayed=${outQueued24h}, failed=${outFailed24h}`);

    // 6. Recent Failures
    // We only care about Meta stability here. Counting all failures (including legacy/undefined)
    // causes false alarms.
    const metaFailures = await adminDb.collection('whatsapp_messages')
      .countDocuments({ status: 'failed', provider: 'meta', createdAt: { $gt: since } });

    const otherFailures = await adminDb.collection('whatsapp_messages')
      .countDocuments({ status: 'failed', provider: { $ne: 'meta' }, createdAt: { $gt: since } });
    
    console.log(`❌ Failures in last 24h (provider=meta): ${metaFailures}`);
    if (otherFailures > 0) {
      console.log(`ℹ️  Other failed records (non-meta): ${otherFailures} (often test/legacy/no-provider sends)`);
    }

    console.log('\n🏥 SUMMARY: If Webhook Hit is recent, your system is LIVE.');

  } catch (err) {
    console.error('❌ Database Connection Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkHealth();
