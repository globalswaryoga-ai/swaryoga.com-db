#!/usr/bin/env node
// Test sending template message with image via QR Bridge

const phone = '919309986820';
const imageUrl = 'https://swarygoal1hindi.s3.us-east-1.amazonaws.com/uploads/content-cache/fbe7b5d9bb30fd79b8197d759ff5edf7.jpg';
const message = `*Swar Yoga Basic Program*
Its Two days Program daily 2 hours,
Date: *2nd and 3rd* Feb-26
Time: 7.00 To 9.00 PM
Its complete Health Program
@ Just 145/- Rs

Swar Yoga Team

📌 I am Interested`;

async function testSend() {
  const bridgeUrl = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://52.91.198.23:3333';
  const bridgeSecret = process.env.WHATSAPP_WEB_BRIDGE_SECRET || process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';
  
  console.log('🔗 Bridge URL:', bridgeUrl);
  console.log('📱 Sending to:', phone);
  console.log('🖼️  Image:', imageUrl.substring(0, 60) + '...');
  
  const payload = {
    to: phone,
    message: '',
    type: 'media',
    media: imageUrl,
    caption: message
  };
  
  console.log('\n📤 Sending...\n');
  
  const res = await fetch(`${bridgeUrl}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bridge-secret': bridgeSecret
    },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json().catch(() => ({}));
  console.log('📊 Response status:', res.status);
  console.log('📨 Response:', JSON.stringify(data, null, 2));
  
  if (res.ok) {
    console.log('\n✅ Message sent successfully!');
  } else {
    console.log('\n❌ Failed to send message');
  }
}

testSend().catch(err => {
  console.error('❌ Error:', err.message);
});
