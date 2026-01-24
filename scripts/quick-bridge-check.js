#!/usr/bin/env node

/**
 * Quick Bridge Status Check
 * Tests if the API route and bridge are accessible from your local machine
 */

const https = require('https');
const http = require('http');

const EC2_IP = '52.91.198.23';
const BRIDGE_PORT = 3333;
const BRIDGE_URL = `http://${EC2_IP}:${BRIDGE_PORT}`;
const API_ROUTE = 'http://localhost:3000/api/admin/crm/whatsapp/qr-bridge';

async function testEndpoint(url, method = 'GET', headers = {}) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'User-Agent': 'Bridge-Status-Check/1.0',
        ...headers,
      },
      timeout: 5000,
    };

    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data.substring(0, 500), // First 500 chars
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'TIMEOUT', status: null });
    });

    req.on('error', (err) => {
      resolve({ error: err.message, status: null });
    });

    req.end();
  });
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     WhatsApp Bridge - Status Check                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Test 1: API Route
  console.log('1️⃣  Checking API Route (/api/admin/crm/whatsapp/qr-bridge)...');
  const apiResult = await testEndpoint(`${API_ROUTE}?path=%2Fstatus`);
  if (apiResult.error) {
    console.log(`   ❌ Error: ${apiResult.error}`);
    console.log('      → Is the dev server running? (npm run dev)\n');
  } else if (apiResult.status === 404) {
    console.log(`   ❌ 404 - API route not found`);
    console.log('      → Run: npm run build\n');
  } else if (apiResult.status === 200) {
    console.log(`   ✅ 200 - API route working!\n`);
  } else {
    console.log(`   ⚠️  Status ${apiResult.status}\n`);
  }

  // Test 2: Direct Bridge - Health
  console.log('2️⃣  Checking EC2 Bridge (/health endpoint)...');
  const healthResult = await testEndpoint(`${BRIDGE_URL}/health`);
  if (healthResult.error === 'TIMEOUT') {
    console.log('   ❌ Connection Timeout');
    console.log(`      → Bridge at ${EC2_IP}:${BRIDGE_PORT} is not responding`);
    console.log('      → Try: npm run bridge:emergency-restart\n');
  } else if (healthResult.error) {
    console.log(`   ❌ Error: ${healthResult.error}`);
    console.log('      → Bridge service may be down\n');
  } else if (healthResult.status === 404) {
    console.log('   ❌ 404 - /health endpoint not found');
    console.log('      → Bridge is running but endpoints missing\n');
  } else if (healthResult.status === 200) {
    console.log('   ✅ 200 - Bridge is responding!\n');
  } else {
    console.log(`   ⚠️  Status ${healthResult.status}\n`);
  }

  // Test 3: Direct Bridge - Status
  console.log('3️⃣  Checking EC2 Bridge (/status endpoint)...');
  const statusResult = await testEndpoint(`${BRIDGE_URL}/status`);
  if (statusResult.error) {
    console.log(`   ❌ Error: ${statusResult.error}\n`);
  } else if (statusResult.status === 200) {
    console.log(`   ✅ 200 - Status endpoint working!\n`);
  } else if (statusResult.status === 404) {
    console.log(`   ❌ 404 - Status endpoint not found\n`);
  } else {
    console.log(`   ⚠️  Status ${statusResult.status}\n`);
  }

  // Summary
  console.log('═════════════════════════════════════════════════════════\n');
  console.log('SUMMARY:');
  console.log('─────────────────────────────────────────────────────────');

  const apiOk = apiResult.status === 200;
  const bridgeOk = healthResult.status === 200 || statusResult.status === 200;

  if (apiOk && bridgeOk) {
    console.log('✅ Everything looks good!');
    console.log('   QR scanning should work.');
  } else if (!apiOk) {
    console.log('❌ API route not working');
    console.log('   • Dev server running? npm run dev');
    console.log('   • Need rebuild? npm run build');
  } else if (!bridgeOk) {
    console.log('❌ Bridge is not responding');
    console.log('   • Try: npm run bridge:emergency-restart');
    console.log('   • Check: npm run bridge:diagnostics');
  }

  console.log('\nNext steps:');
  if (!apiOk && !bridgeOk) {
    console.log('  1. npm run dev');
    console.log('  2. npm run bridge:emergency-restart');
  } else if (!apiOk) {
    console.log('  1. npm run build');
    console.log('  2. Refresh browser');
  } else if (!bridgeOk) {
    console.log('  1. npm run bridge:emergency-restart');
    console.log('  2. Refresh browser');
  } else {
    console.log('  1. Refresh browser');
    console.log('  2. Try WhatsApp QR');
  }

  console.log('\n');
}

main().catch(console.error);
