#!/usr/bin/env node
// Send template with image and buttons via QR WhatsApp Bridge
require('dotenv').config({ path: '.env.local' });

const bridgeUrl = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://52.91.198.23:3333';
const bridgeSecret = process.env.WHATSAPP_WEB_BRIDGE_SECRET || 'swar-bridge-secret-2024';

// Target phone number
const phone = process.argv[2] || '919309986820';

// Template image URL
const imageUrl = 'https://swarygoal1hindi.s3.us-east-1.amazonaws.com/uploads/content-cache/fbe7b5d9bb30fd79b8197d759ff5edf7.jpg';

// Template content (body text)
const bodyText = `*Swar Yoga Basic Program*
Its Two days Program daily 2 hours,
Date: *2nd and 3rd* Feb-26
Time: 7.00 To 9.00 PM
Its complete Health Program
@ Just 145/- Rs

Swar Yoga Team`;

// Buttons
const buttons = ['I am Interested'];

async function sendViaQRBridge() {
  console.log('🔗 QR Bridge URL:', bridgeUrl);
  console.log('📞 Sending to:', phone);
  console.log('');

  // First check if bridge is connected
  try {
    const statusRes = await fetch(`${bridgeUrl}/status`, {
      headers: { 'x-bridge-secret': bridgeSecret }
    });
    const statusData = await statusRes.json();
    console.log('📡 Bridge Status:', statusData.status || 'unknown');
    if (statusData.status !== 'connected') {
      console.log('⚠️  Bridge not connected. Please scan QR code first.');
      return;
    }
  } catch (err) {
    console.error('❌ Cannot reach bridge:', err.message);
    return;
  }

  // Send template with image and buttons via /send-template endpoint
  console.log('\n📤 Sending template with image and button via QR Bridge...\n');

  const payload = {
    to: phone,
    imageUrl: imageUrl,
    bodyText: bodyText,
    buttons: buttons,
    footerText: 'Swar Yoga'
  };

  console.log('📦 Payload:', JSON.stringify(payload, null, 2));

  try {
    const res = await fetch(`${bridgeUrl}/send-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': bridgeSecret
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('\n📊 Response status:', res.status);
    console.log('📨 Response:', JSON.stringify(data, null, 2));

    if (res.ok && data.success) {
      console.log('\n✅ Template sent via QR Bridge!');
      console.log('📧 Message IDs:', data.messageIds || data.id);
      console.log('\n🔔 Check WhatsApp on phone:', phone);
    } else {
      console.log('\n❌ Failed to send');
      console.log('Error:', data.error || 'Unknown error');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

sendViaQRBridge();
