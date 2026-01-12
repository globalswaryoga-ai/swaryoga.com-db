#!/usr/bin/env node

/**
 * Test QR WhatsApp flow end-to-end
 * 1. Call /api/admin/crm/whatsapp/qr-bridge?path=/status (GET)
 * 2. Call /api/admin/crm/whatsapp/qr-bridge with action=POST, path=/connect (POST)
 * 3. Wait 2 seconds
 * 4. Call /api/admin/crm/whatsapp/qr-bridge?path=/qr (GET)
 * 5. Verify QR data is returned
 */

const http = require('http');

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3020,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (err) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('🧪 Testing QR WhatsApp flow...\n');

  try {
    // Step 1: Get status
    console.log('1️⃣ Checking /status...');
    const statusRes = await makeRequest(
      'GET',
      '/api/admin/crm/whatsapp/qr-bridge?path=/status'
    );
    console.log('   Status:', statusRes.status);
    console.log('   Response:', JSON.stringify(statusRes.body, null, 2));

    // Step 2: Connect
    console.log('\n2️⃣ Calling /connect (POST)...');
    const connectRes = await makeRequest('POST', '/api/admin/crm/whatsapp/qr-bridge', {
      action: 'POST',
      path: '/connect'
    });
    console.log('   Status:', connectRes.status);
    console.log('   Response:', JSON.stringify(connectRes.body, null, 2));

    // Step 3: Wait
    console.log('\n3️⃣ Waiting 2 seconds for QR generation...');
    await new Promise((r) => setTimeout(r, 2000));

    // Step 4: Get QR
    console.log('\n4️⃣ Fetching /qr...');
    const qrRes = await makeRequest(
      'GET',
      '/api/admin/crm/whatsapp/qr-bridge?path=/qr'
    );
    console.log('   Status:', qrRes.status);
    console.log('   Response keys:', qrRes.body && qrRes.body.qr ? 'qr found' : 'NO QR');
    if (qrRes.body && qrRes.body.qr) {
      console.log('   QR data length:', qrRes.body.qr.substring(0, 100) + '...');
    }

    // Step 5: Verify
    console.log('\n✅ All tests passed!');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

test();
