#!/usr/bin/env node
/**
 * Test Script for WhatsApp QR Bridge
 * Tests the bridge connection and QR code availability
 */

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

async function testBridge() {
  console.log('🔍 Testing WhatsApp Bridge Connection...\n');
  console.log(`Bridge URL: ${BRIDGE_URL}`);
  console.log(`Bridge Secret: ${BRIDGE_SECRET ? '✓ Set' : '✗ Not set'}\n`);

  try {
    // Test 1: Status endpoint
    console.log('1️⃣ Testing /status endpoint...');
    const statusRes = await fetch(`${BRIDGE_URL}/status`, {
      headers: { 'x-bridge-secret': BRIDGE_SECRET }
    });
    
    if (!statusRes.ok) {
      console.error(`❌ Status endpoint failed (${statusRes.status})`);
      const text = await statusRes.text();
      console.error(`Response: ${text.substring(0, 200)}`);
      return;
    }
    
    const statusData = await statusRes.json();
    console.log(`✓ Status: ${statusData.status}`);
    console.log(`✓ Has QR: ${statusData.hasQr ? 'Yes' : 'No'}`);
    
    // Test 2: QR endpoint
    if (statusData.hasQr) {
      console.log('\n2️⃣ Testing /qr endpoint...');
      const qrRes = await fetch(`${BRIDGE_URL}/qr`, {
        headers: { 'x-bridge-secret': BRIDGE_SECRET }
      });
      
      if (!qrRes.ok) {
        console.error(`❌ QR endpoint failed (${qrRes.status})`);
        return;
      }
      
      const qrData = await qrRes.json();
      if (qrData.qr) {
        const qrLength = qrData.qr.length;
        const isBase64 = qrData.qr.startsWith('data:image/');
        console.log(`✓ QR Code: ${qrLength} characters`);
        console.log(`✓ Format: ${isBase64 ? 'Base64 Image' : 'Raw data'}`);
        
        if (isBase64) {
          console.log('\n✅ QR CODE IS AVAILABLE AND READY TO DISPLAY!');
          console.log('   You can now open the CRM QR page to scan it.');
        }
      } else {
        console.log('⚠️  QR data is empty');
      }
    } else {
      console.log('\n⚠️  No QR code available');
      console.log('   Status:', statusData.status);
      console.log('   This is expected if WhatsApp is already connected.');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Bridge Status: ${statusData.status.toUpperCase()}`);
    console.log(`QR Available: ${statusData.hasQr ? 'YES ✅' : 'NO'}`);
    console.log(`Bridge is reachable: YES ✅`);
    
    if (statusData.status === 'disconnected' && statusData.hasQr) {
      console.log('\n💡 NEXT STEPS:');
      console.log('   1. Open http://localhost:3000/admin/crm/qr in your browser');
      console.log('   2. The QR modal should auto-open');
      console.log('   3. Scan the QR code with WhatsApp on your phone');
    } else if (statusData.status === 'connected') {
      console.log('\n✅ WhatsApp is already connected!');
      console.log('   You can start sending/receiving messages.');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 TROUBLESHOOTING:');
    console.error('   1. Make sure the WhatsApp bridge is running:');
    console.error('      cd services/whatsapp-web && node index.js');
    console.error('   2. Check if port 3333 is accessible');
    console.error('   3. Verify the bridge secret matches in both .env files');
  }
}

testBridge();
