#!/usr/bin/env node

/**
 * Diagnose QR Bridge Connection Issues
 * 
 * Run this to check:
 * 1. Is the bridge service running?
 * 2. Can we reach the bridge?
 * 3. What's the bridge status?
 */

const http = require('http');

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://3.109.154.61:3333';
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

console.log('🔍 QR Bridge Diagnostics');
console.log('========================\n');
console.log(`Bridge URL: ${BRIDGE_URL}`);
console.log(`Bridge Secret: ${BRIDGE_SECRET}\n`);

async function testBridgeConnection() {
  return new Promise((resolve) => {
    const url = new URL('/status', BRIDGE_URL);
    
    console.log(`📡 Testing connection to ${url.toString()}...`);
    
    const timeout = setTimeout(() => {
      console.error(`❌ TIMEOUT: Bridge did not respond within 5 seconds`);
      console.log('\n💡 Possible causes:');
      console.log('   1. Bridge service is not running on the EC2 instance');
      console.log('   2. EC2 instance is down or unreachable');
      console.log('   3. Security group blocks port 3333');
      console.log('   4. Bridge process crashed\n');
      resolve(false);
    }, 5000);
    
    const req = http.get(url, {
      headers: {
        'x-bridge-secret': BRIDGE_SECRET
      }
    }, (res) => {
      clearTimeout(timeout);
      console.log(`✅ Connection successful! Status code: ${res.statusCode}\n`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('📊 Bridge Status:');
          console.log(JSON.stringify(parsed, null, 2));
          resolve(true);
        } catch (e) {
          console.log('📊 Bridge Response:');
          console.log(data);
          resolve(true);
        }
      });
    });
    
    req.on('error', (err) => {
      clearTimeout(timeout);
      console.error(`❌ Connection failed: ${err.message}\n`);
      console.log('💡 This likely means:');
      console.log('   - Bridge service is NOT running');
      console.log('   - EC2 instance is not accessible from this location');
      console.log('   - Firewall/Security group blocking the connection\n');
      resolve(false);
    });
  });
}

async function main() {
  const connected = await testBridgeConnection();
  
  if (!connected) {
    console.log('🚨 ACTIONS TO TAKE:');
    console.log('1. SSH into EC2 instance: ssh -i key.pem ec2-user@3.109.154.61');
    console.log('2. Check if bridge process is running: ps aux | grep whatsapp');
    console.log('3. Start bridge if needed: npm start (or appropriate command)');
    console.log('4. Check bridge logs for errors');
    console.log('5. Verify port 3333 is open: sudo ufw status (or AWS Security Groups)');
  } else {
    console.log('✅ Bridge is responsive!');
    console.log('\nIf the QR page is still not connecting, check:');
    console.log('1. Browser console for errors (F12 → Console)');
    console.log('2. Network tab to see which requests are failing');
    console.log('3. Check /api/admin/crm/whatsapp/qr-bridge is working');
  }
  
  process.exit(connected ? 0 : 1);
}

main().catch(console.error);
