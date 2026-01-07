#!/usr/bin/env node

/**
 * DIAGNOSTIC: Incoming WhatsApp Message Flow
 * Tests if messages are being stored and retrieved correctly
 */

const crypto = require('crypto');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3004';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'test-token';
const WEBHOOK_SECRET = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || 'test-secret';

const TEST_PHONE = '919779006820';
const TEST_MESSAGE_ID = `test-msg-${Date.now()}`;
const TEST_MESSAGE_BODY = `Test incoming message - ${new Date().toISOString()}`;

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║   INCOMING MESSAGE DIAGNOSTIC                                 ║');
console.log('║   Testing: webhook → database → API → frontend                ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function fetchJson(url, options = {}) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, json, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, json: { raw: data }, headers: res.headers });
        }
      });
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testIncomingMessage() {
  console.log('STEP 1: Prepare test webhook payload');
  console.log('─'.repeat(60));

  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '919309986820',
            phone_number_id: '733788303156745'
          },
          messages: [{
            from: TEST_PHONE,
            id: TEST_MESSAGE_ID,
            timestamp: String(Math.floor(Date.now() / 1000)),
            type: 'text',
            text: { body: TEST_MESSAGE_BODY }
          }]
        }
      }]
    }]
  };

  const payloadStr = JSON.stringify(payload);
  const signature = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payloadStr)
    .digest('hex');

  console.log('✅ Payload created');
  console.log('   Phone: ' + TEST_PHONE);
  console.log('   Message ID: ' + TEST_MESSAGE_ID);
  console.log('   Body: ' + TEST_MESSAGE_BODY.substring(0, 50) + '...');
  console.log('   Signature: ' + signature.substring(0, 20) + '...\n');

  console.log('STEP 2: Send webhook to /api/whatsapp/webhook');
  console.log('─'.repeat(60));

  const webhookRes = await fetchJson(`${BASE_URL}/api/whatsapp/webhook`, {
    method: 'POST',
    headers: {
      'X-Hub-Signature-256': signature,
    },
    body: payloadStr,
  });

  console.log(`Status: ${webhookRes.status}`);
  console.log(`Response:`, JSON.stringify(webhookRes.json, null, 2).substring(0, 200));

  if (webhookRes.status !== 200) {
    console.error('❌ Webhook failed!');
    return;
  }
  console.log('✅ Webhook accepted\n');

  // Wait for database write
  console.log('STEP 3: Wait for message to be stored (5 seconds)');
  console.log('─'.repeat(60));
  await new Promise(r => setTimeout(r, 5000));
  console.log('✅ Waited\n');

  console.log('STEP 4: Query conversations API');
  console.log('─'.repeat(60));

  const convRes = await fetchJson(`${BASE_URL}/api/admin/crm/whatsapp/meta/conversations`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
    },
  });

  console.log(`Status: ${convRes.status}`);
  const conversations = convRes.json?.data || [];
  console.log(`Found ${conversations.length} conversations`);

  if (conversations.length > 0) {
    const testConv = conversations.find(c => c.phoneNumber === TEST_PHONE);
    if (testConv) {
      console.log('✅ Found conversation for test phone!');
      console.log('   Phone:', testConv.phoneNumber);
      console.log('   Last message:', testConv.lastMessage?.substring(0, 50));
      console.log('   Lead ID:', testConv.leadId);
    } else {
      console.warn('⚠️  Test phone not in conversations');
      console.log('Available phones:', conversations.map(c => c.phoneNumber).join(', '));
    }
  } else {
    console.warn('⚠️  No conversations found');
  }
  console.log();

  console.log('STEP 5: Query messages API for test phone');
  console.log('─'.repeat(60));

  const msgsRes = await fetchJson(`${BASE_URL}/api/admin/crm/whatsapp/meta/messages?phoneNumber=${TEST_PHONE}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
    },
  });

  console.log(`Status: ${msgsRes.status}`);
  const messages = msgsRes.json?.data || [];
  console.log(`Found ${messages.length} messages for ${TEST_PHONE}`);

  if (messages.length > 0) {
    const testMsg = messages.find(m => m.waMessageId === TEST_MESSAGE_ID);
    if (testMsg) {
      console.log('✅ Found test message!');
      console.log('   ID:', testMsg.waMessageId);
      console.log('   Content:', testMsg.messageContent);
      console.log('   Direction:', testMsg.direction);
      console.log('   Status:', testMsg.status);
    } else {
      console.warn('⚠️  Test message not found');
      console.log('First message:', JSON.stringify(messages[0], null, 2).substring(0, 200));
    }
  } else {
    console.warn('⚠️  No messages found for this phone');
  }
  console.log();

  console.log('═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));

  if (webhookRes.status === 200 && conversations.length > 0 && messages.length > 0) {
    console.log('✅ PASS: Complete flow working!');
    console.log('   Webhook → DB → API all working correctly');
  } else {
    console.log('❌ FAIL: Somewhere in the flow is broken');
    if (webhookRes.status !== 200) console.log('   ❌ Webhook not accepting messages');
    if (conversations.length === 0) console.log('   ❌ Conversations not loading');
    if (messages.length === 0) console.log('   ❌ Messages not stored or not queryable');
  }
  console.log();
}

testIncomingMessage().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
