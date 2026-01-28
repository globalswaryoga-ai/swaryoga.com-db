#!/usr/bin/env node
// Test sending swaryogabesic template (with image header)

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

async function sendTemplate() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appSecret = process.env.META_APP_SECRET;
  
  const appSecretProof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  
  // First check the template structure
  const wabaId = process.env.WHATSAPP_WABA_ID || '1095304632815228';
  const checkUrl = `https://graph.facebook.com/v24.0/${wabaId}/message_templates?name=swaryogabesic&appsecret_proof=${appSecretProof}`;
  
  const checkRes = await fetch(checkUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const checkData = await checkRes.json();
  
  console.log('📋 Template swaryogabesic:');
  if (checkData.data?.[0]) {
    const t = checkData.data[0];
    console.log('   Language:', t.language);
    console.log('   Components:', t.components?.map(c => `${c.type}${c.format ? `(${c.format})` : ''}`).join(', '));
  }
  
  // Send the template
  const url = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages?appsecret_proof=${appSecretProof}`;
  
  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'swaryogabesic',
      language: { code: 'en' }
    }
  };
  
  console.log('\n📤 Sending swaryogabesic template to', phone, '...\n');
  
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
    console.log('\n✅ Template with image sent!');
    console.log('📧 Message ID:', data.messages[0].id);
  } else {
    console.log('\n❌ Failed to send');
  }
}

sendTemplate().catch(console.error);
