#!/usr/bin/env node
// Test sending template via Meta Cloud API

const phone = '919309986820';

async function testMetaSend() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!accessToken || !phoneNumberId) {
    console.log('❌ Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID');
    console.log('Loading from .env.local...');
    
    const fs = require('fs');
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('WHATSAPP_ACCESS_TOKEN=')) {
        process.env.WHATSAPP_ACCESS_TOKEN = line.split('=').slice(1).join('=').trim();
      }
      if (line.startsWith('WHATSAPP_PHONE_NUMBER_ID=')) {
        process.env.WHATSAPP_PHONE_NUMBER_ID = line.split('=').slice(1).join('=').trim();
      }
    }
  }
  
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  console.log('📱 Phone Number ID:', phoneId);
  console.log('📞 Sending to:', phone);
  
  // Send template via Meta Cloud API
  const url = `https://graph.facebook.com/v24.0/${phoneId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'swaryogabasic',
      language: { code: 'en_US' },
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: 'https://swarygoal1hindi.s3.us-east-1.amazonaws.com/uploads/content-cache/fbe7b5d9bb30fd79b8197d759ff5edf7.jpg'
              }
            }
          ]
        }
      ]
    }
  };
  
  console.log('\n📤 Sending via Meta Cloud API...\n');
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json().catch(() => ({}));
  console.log('📊 Response status:', res.status);
  console.log('📨 Response:', JSON.stringify(data, null, 2));
  
  if (res.ok) {
    console.log('\n✅ Template sent successfully via Meta!');
  } else {
    console.log('\n❌ Failed to send');
  }
}

testMetaSend().catch(err => {
  console.error('❌ Error:', err.message);
});
