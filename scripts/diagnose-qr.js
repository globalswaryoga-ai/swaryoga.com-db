#!/usr/bin/env node

/**
 * QR Bridge Diagnostics
 * Debug why QR is not showing on domain
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

async function checkBridge(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    client.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data.substring(0, 200),
          ok: res.statusCode >= 200 && res.statusCode < 400
        });
      });
    }).on('error', (err) => {
      resolve({ error: err.message, ok: false });
    });
  });
}

async function diagnose() {
  console.log('\n🔍 QR BRIDGE DIAGNOSTIC\n');
  
  // 1. Check .env.local
  console.log('1️⃣  Checking Configuration (.env.local)');
  const envFile = path.join(__dirname, '../.env.local');
  const content = fs.readFileSync(envFile, 'utf-8');
  
  const bridgeUrl = content.match(/NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=([^\n]+)/)?.[1]?.trim();
  const baseUrl = content.match(/NEXT_BASE_URL=([^\n]+)/)?.[1]?.trim();
  
  console.log(`   Bridge URL: ${bridgeUrl}`);
  console.log(`   Base URL: ${baseUrl}`);
  
  // 2. Determine context
  console.log('\n2️⃣  Context Analysis');
  const isLocal = baseUrl?.includes('localhost') || baseUrl?.includes('127.0.0.1');
  const isDomain = baseUrl?.includes('crm.swaryoga.com');
  
  if (isLocal) {
    console.log('   Context: LOCAL DEVELOPMENT ✓');
  } else if (isDomain) {
    console.log('   Context: PRODUCTION DOMAIN ⚠️');
  } else {
    console.log('   Context: UNKNOWN');
  }
  
  // 3. Check bridge accessibility
  console.log('\n3️⃣  Bridge Connectivity Test');
  
  if (bridgeUrl) {
    const result = await checkBridge(bridgeUrl);
    if (result.ok) {
      console.log(`   ✅ Bridge is REACHABLE: ${bridgeUrl}`);
      console.log(`   Response: ${result.data}`);
    } else {
      console.log(`   ❌ Bridge NOT REACHABLE: ${bridgeUrl}`);
      console.log(`   Error: ${result.error || `HTTP ${result.status}`}`);
    }
  }
  
  // 4. Troubleshooting suggestions
  console.log('\n4️⃣  Troubleshooting Guide');
  
  if (isDomain && bridgeUrl?.includes('localhost')) {
    console.log('\n   ⚠️  ISSUE FOUND: Domain trying to use localhost bridge');
    console.log('\n   🔧 SOLUTION:');
    console.log('   \n   Your .env.local has:');
    console.log(`   NEXT_BASE_URL=${baseUrl}`);
    console.log(`   NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=${bridgeUrl}`);
    console.log('\n   But localhost:3333 is NOT accessible from domain clients!');
    console.log('\n   FIX: Update .env.local with one of:');
    console.log('\n   Option 1 - EC2 Bridge IP:');
    console.log('   NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://13.51.112.100:3333');
    console.log('\n   Option 2 - Bridge Subdomain:');
    console.log('   NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://bridge.crm.swaryoga.com');
    console.log('\n   Option 3 - Use setup script:');
    console.log('   node scripts/setup-domain.js crm.swaryoga.com 13.51.112.100');
  } else if (isLocal) {
    console.log('\n   ✅ Local configuration looks correct');
    console.log('\n   To verify QR is working:');
    console.log('   1. Visit: http://localhost:3020/admin/crm/qr');
    console.log('   2. Open browser console (F12)');
    console.log('   3. Look for GET /api/admin/crm/whatsapp/qr-bridge');
    console.log('   4. Should see QR code');
  }
  
  console.log('\n5️⃣  What to do next:');
  console.log('\n   For Domain (crm.swaryoga.com):');
  console.log('   1. Find your EC2/Bridge server IP');
  console.log('   2. Update .env.local:');
  console.log('      NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://YOUR_IP:3333');
  console.log('   3. Restart dev server or redeploy');
  console.log('   4. Test: curl http://YOUR_IP:3333/status');
  console.log('\n   For Local:');
  console.log('   1. Ensure bridge is running: lsof -i:3333');
  console.log('   2. Visit: http://localhost:3020/admin/crm/qr');
  console.log('   3. Check browser console for errors');
  
  console.log('\n6️⃣  Common Issues:');
  console.log('   • Bridge not running → Start it: cd deploy/wa-bridge && node server.js');
  console.log('   • Firewall blocking 3333 → Check AWS security group');
  console.log('   • Wrong IP address → Verify EC2 public IP');
  console.log('   • CORS errors → API proxy should handle, check logs');
  console.log('   • SSL/HTTPS errors → Use HTTP or proper SSL cert');
  
  console.log('\n');
}

diagnose().catch(console.error);
