#!/usr/bin/env node
/**
 * Diagnostic script to identify 404 errors in WhatsApp bridge
 * - Checks if bridge is running
 * - Tests /chats endpoint
 * - Tests /messages endpoint
 * - Tests qr-bridge proxy
 */

const http = require('http');
const https = require('https');

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://52.91.198.23:3333';
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';
const CRM_URL = 'https://crm.swaryoga.com';

console.log('🔍 WhatsApp Bridge 404 Diagnostic\n');
console.log(`Bridge URL: ${BRIDGE_URL}`);
console.log(`Bridge Secret: ${BRIDGE_SECRET.substring(0, 5)}...`);
console.log(`CRM URL: ${CRM_URL}\n`);

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request(url, {
      method: options.method || 'GET',
      timeout: options.timeout || 10000,
      headers: {
        'x-bridge-secret': BRIDGE_SECRET,
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function test(name, url, options = {}) {
  process.stdout.write(`\n📌 Testing: ${name}\n   URL: ${url}\n   `);
  try {
    const result = await makeRequest(url, options);
    const status = result.ok ? '✅' : '❌';
    console.log(`${status} Status: ${result.status}`);
    if (result.body) {
      try {
        const json = JSON.parse(result.body);
        console.log(`   Response: ${JSON.stringify(json).substring(0, 100)}...`);
      } catch {
        console.log(`   Response: ${result.body.substring(0, 100)}...`);
      }
    }
    return result;
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
    return null;
  }
}

async function run() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1️⃣  DIRECT BRIDGE TESTS (EC2)\n');
  
  await test('Bridge Health', `${BRIDGE_URL}/health`);
  await test('Bridge Status', `${BRIDGE_URL}/status`);
  await test('Bridge Chats', `${BRIDGE_URL}/chats`);
  await test('Bridge Messages', `${BRIDGE_URL}/messages/all`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('2️⃣  QR-BRIDGE PROXY TESTS (Vercel)\n');

  if (CRM_URL.includes('localhost')) {
    console.log('⚠️  Localhost CRM detected - skipping proxy tests');
  } else {
    const chatsProxyUrl = `${CRM_URL}/api/admin/crm/whatsapp/qr-bridge?path=%2Fchats`;
    const statusProxyUrl = `${CRM_URL}/api/admin/crm/whatsapp/qr-bridge?path=%2Fstatus`;
    
    await test('Proxy: /chats', chatsProxyUrl, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    await test('Proxy: /status', statusProxyUrl, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('3️⃣  ANALYSIS\n');

  // Test direct bridge
  const bridgeStatus = await makeRequest(`${BRIDGE_URL}/status`);
  if (!bridgeStatus) {
    console.log('❌ CRITICAL: Bridge is not responding');
    console.log('   → EC2 may be down or bridge service not running');
    console.log('   → Check: ssh ec2-user@52.91.198.23 "pm2 status"');
  } else if (bridgeStatus.status === 404) {
    console.log('❌ ERROR: Bridge returned 404');
    console.log('   → /status endpoint missing (check bridge code)');
  } else if (bridgeStatus.status === 200) {
    console.log('✅ Bridge is running');
    
    // Test /chats endpoint
    const chats = await makeRequest(`${BRIDGE_URL}/chats`);
    if (!chats) {
      console.log('⚠️  WARNING: /chats endpoint not responding');
    } else if (chats.status === 404) {
      console.log('❌ ERROR: /chats endpoint returns 404');
      console.log('   → Route not registered in bridge');
      console.log('   → Check: services/whatsapp-web/index.js line 766');
    } else if (chats.status === 400) {
      console.log('⚠️  WARNING: /chats returns 400 (probably client not connected)');
      try {
        const body = JSON.parse(chats.body);
        console.log(`   → Message: ${body.error}`);
      } catch {}
    } else if (chats.ok) {
      console.log('✅ /chats endpoint working');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💡 RECOMMENDATIONS:\n');
  
  if (!bridgeStatus) {
    console.log('1. Check if EC2 instance is running');
    console.log('   AWS Console → EC2 → Instances → Look for "whatsapp-bridge"');
    console.log('\n2. SSH into EC2 and check PM2:');
    console.log('   ssh ec2-user@52.91.198.23');
    console.log('   pm2 status');
    console.log('   pm2 logs index');
  } else {
    console.log('1. Verify bridge code has /chats endpoint registered');
    console.log('2. Check bridge service logs: pm2 logs index');
    console.log('3. Verify BRIDGE_SECRET matches in both .env files');
    console.log('4. Check if WhatsApp client is connected (send QR scan)');
  }

  console.log('\n');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
