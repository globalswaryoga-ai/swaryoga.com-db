#!/usr/bin/env node
// Diagnose and send WhatsApp template via Meta API

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

const phone = process.argv[2] || '919309986820'; // Default to owner's number

async function main() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appSecret = process.env.META_APP_SECRET;
  const wabaId = process.env.WHATSAPP_WABA_ID || '1095304632815228';
  
  if (!accessToken || !phoneNumberId || !appSecret) {
    console.error('❌ Missing env variables: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, or META_APP_SECRET');
    return;
  }
  
  const appSecretProof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  
  console.log('🔍 Checking Meta template configuration...\n');
  console.log('📱 Phone Number ID:', phoneNumberId);
  console.log('🏢 WABA ID:', wabaId);
  console.log('📞 Target phone:', phone);
  
  // Check the template status on Meta
  const checkUrl = `https://graph.facebook.com/v24.0/${wabaId}/message_templates?name=swaryogabesic&appsecret_proof=${appSecretProof}`;
  
  const checkRes = await fetch(checkUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const checkData = await checkRes.json();
  
  console.log('\n📋 Template "swaryogabesic" from Meta:');
  if (checkData.data?.[0]) {
    const t = checkData.data[0];
    console.log('   ✅ Status:', t.status);
    console.log('   📝 Language:', t.language);
    console.log('   📦 Components:');
    for (const c of (t.components || [])) {
      console.log(`      - ${c.type}: ${c.format || c.text || JSON.stringify(c)}`);
    }
  } else {
    console.log('   ❌ Template not found or error:', checkData.error?.message || 'Unknown');
    
    // List all templates
    const listUrl = `https://graph.facebook.com/v24.0/${wabaId}/message_templates?appsecret_proof=${appSecretProof}`;
    const listRes = await fetch(listUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const listData = await listRes.json();
    console.log('\n📄 Available templates:');
    for (const t of (listData.data || [])) {
      console.log(`   - ${t.name} (${t.language}): ${t.status}`);
    }
    return;
  }
  
  // Send the template
  console.log('\n📤 Sending template to', phone, '...\n');
  
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
  } else {
    console.log('\n❌ Failed to send');
    if (data.error) {
      console.log('🔴 Error code:', data.error.code);
      console.log('🔴 Error message:', data.error.message);
      console.log('🔴 Error details:', data.error.error_data);
    }
  }
}

main().catch(console.error);
