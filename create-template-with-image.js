#!/usr/bin/env node
// Create new template WITH image header on Meta

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

async function createTemplate() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WHATSAPP_WABA_ID || '1095304632815228';
  const appSecret = process.env.META_APP_SECRET;
  
  const appSecretProof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  
  const url = `https://graph.facebook.com/v24.0/${wabaId}/message_templates?appsecret_proof=${appSecretProof}`;
  
  // New template with IMAGE header
  const payload = {
    name: 'swaryogabasic_v2',
    language: 'en_US',
    category: 'MARKETING',
    components: [
      {
        type: 'HEADER',
        format: 'IMAGE',
        example: {
          header_handle: ['https://swarygoal1hindi.s3.us-east-1.amazonaws.com/uploads/content-cache/fbe7b5d9bb30fd79b8197d759ff5edf7.jpg']
        }
      },
      {
        type: 'BODY',
        text: '*Swar Yoga Basic Program*\nIts Two days Program daily 2 hours,\nDate: *2nd and 3rd* Feb-26\nTime: 7.00 To 9.00 PM\nIts complete Health Program\n@ Just 145/- Rs'
      },
      {
        type: 'FOOTER',
        text: 'Swar Yoga Team'
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'QUICK_REPLY',
            text: 'I am Interested'
          }
        ]
      }
    ]
  };
  
  console.log('📤 Creating new template with image header...\n');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
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
  
  if (res.ok && data.id) {
    console.log('\n✅ Template created! ID:', data.id);
    console.log('⏳ Status: Pending approval (Meta will review)');
  } else {
    console.log('\n❌ Failed to create template');
  }
}

createTemplate().catch(console.error);
