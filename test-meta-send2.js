#!/usr/bin/env node
// Test sending template via Meta Cloud API using the proper lib function

const fs = require('fs');
const crypto = require('crypto');

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');
for (const line of lines) {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#')) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
}

const phone = '919309986820';

async function testMetaSend() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  
  console.log('📱 Phone Number ID:', phoneNumberId);
  console.log('🔑 App Secret:', appSecret ? 'Found' : 'Missing');
  console.log('📞 Sending to:', phone);
  
  // Generate app secret proof
  const appSecretProof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  
  // Send template via Meta Cloud API
  const url = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages?appsecret_proof=${appSecretProof}`;
  
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
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json().catch(() => ({}));
  console.log('📊 Response status:', res.status);
  console.log('📨 Response:', JSON.stringify(data, null, 2));
  
  if (res.ok && data.messages?.[0]?.id) {
    console.log('\n✅ Template sent successfully via Meta!');
    console.log('📧 Message ID:', data.messages[0].id);
  } else {
    console.log('\n❌ Failed to send');
  }
}

testMetaSend().catch(err => {
  console.error('❌ Error:', err.message);
});
