#!/usr/bin/env node

const http = require('http');

const BRIDGE_URL = 'http://3.109.154.61:3333';
const BRIDGE_SECRET = 'swar-bridge-secret-2024';

async function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const url = new URL(BRIDGE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'X-Bridge-Secret': BRIDGE_SECRET,
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function checkQRStatus() {
  console.log('🔍 QR Code Status Verification\n');
  console.log(`Bridge URL: ${BRIDGE_URL}\n`);

  try {
    // 1. Check bridge status
    console.log('1️⃣  Bridge Status:');
    const status = await makeRequest('/status');
    console.log(`   Status: ${status.status}`);
    console.log(`   Data:`, JSON.stringify(status.data, null, 2));

    // 2. Check QR
    console.log('\n2️⃣  QR Code Status:');
    const qr = await makeRequest('/qr');
    console.log(`   Status: ${qr.status}`);
    console.log(`   Data:`, JSON.stringify(qr.data, null, 2));
    
    if (qr.data?.hasQr === false) {
      console.log('\n   ⚠️  No QR code generated yet');
    } else if (qr.data?.hasQr === true) {
      console.log('\n   ✅ QR code available!');
    }

    // 3. Trigger connection if needed
    if (!qr.data?.hasQr) {
      console.log('\n3️⃣  Triggering connection initialization...');
      const connect = await makeRequest('/connect', 'POST');
      console.log(`   Status: ${connect.status}`);
      console.log(`   Data:`, JSON.stringify(connect.data, null, 2));
      
      // Wait and check QR again
      console.log('\n   ⏳ Waiting 10 seconds for QR generation...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      console.log('\n4️⃣  Re-checking QR status...');
      const qr2 = await makeRequest('/qr');
      console.log(`   Status: ${qr2.status}`);
      console.log(`   Data:`, JSON.stringify(qr2.data, null, 2));
      
      if (qr2.data?.hasQr === true) {
        console.log('\n   ✅ QR code now available!');
      } else {
        console.log('\n   ❌ QR code still not available');
        console.log('\n   💡 Troubleshooting:');
        console.log('      - Check if Chromium is installed on EC2');
        console.log('      - Run: bash scripts/emergency-fix-qr.sh');
        console.log('      - Or: bash setup-permanent-solution.sh');
      }
    }

    console.log('\n5️⃣  Bridge Health Check:');
    const health = await makeRequest('/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Data:`, JSON.stringify(health.data, null, 2));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Bridge appears to be unreachable.');
    console.log('   Possible causes:');
    console.log('   - EC2 instance is down');
    console.log('   - Security group rules need updating');
    console.log('   - Bridge process crashed');
    console.log('\n   Fix: bash setup-permanent-solution.sh');
  }
}

checkQRStatus().catch(console.error);
