#!/usr/bin/env node
// Send WhatsApp template WITH image header

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

const phone = process.argv[2] || '919309986820';

// Image URL for the template header (from the Swar Yoga Basic Program image)
const imageUrl = 'https://swarygoal1hindi.s3.us-east-1.amazonaws.com/uploads/content-cache/fbe7b5d9bb30fd79b8197d759ff5edf7.jpg';

async function main() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appSecret = process.env.META_APP_SECRET;
  
  const appSecretProof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  
  console.log('📤 Sending swaryogabesic template WITH image to', phone, '...\n');
  
  const url = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages?appsecret_proof=${appSecretProof}`;
  
  // Template with IMAGE header needs the image component
  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'swaryogabesic',
      language: { code: 'en' },
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: imageUrl
              }
            }
          ]
        }
      ]
    }
  };
  
  console.log('📦 Payload:', JSON.stringify(payload, null, 2));
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json().catch(() => ({}));
  console.log('\n📊 Response status:', res.status);
  console.log('📨 Response:', JSON.stringify(data, null, 2));
  
  if (res.ok && data.messages?.[0]?.id) {
    console.log('\n✅ Template SENT successfully!');
    console.log('📧 Message ID:', data.messages[0].id);
    console.log('📍 Message status:', data.messages[0].message_status);
    console.log('\n🔔 Check your WhatsApp on phone:', phone);
  } else {
    console.log('\n❌ Failed to send');
    if (data.error) {
      console.log('🔴 Error code:', data.error.code);
      console.log('🔴 Error message:', data.error.message);
      console.log('🔴 Error details:', JSON.stringify(data.error.error_data));
    }
  }
}

main().catch(console.error);
