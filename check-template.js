#!/usr/bin/env node
// Check template structure on Meta

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

async function checkTemplate() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WHATSAPP_WABA_ID || '1095304632815228';
  const appSecret = process.env.META_APP_SECRET;
  
  const appSecretProof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  
  // Get template details from Meta
  const url = `https://graph.facebook.com/v24.0/${wabaId}/message_templates?name=swaryogabasic&appsecret_proof=${appSecretProof}`;
  
  console.log('🔍 Checking template on Meta...\n');
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const data = await res.json().catch(() => ({}));
  
  if (data.data && data.data[0]) {
    const template = data.data[0];
    console.log('📋 Template Name:', template.name);
    console.log('📊 Status:', template.status);
    console.log('🌍 Language:', template.language);
    console.log('\n📦 Components:');
    
    template.components?.forEach((comp, i) => {
      console.log(`\n  ${i + 1}. Type: ${comp.type}`);
      if (comp.format) console.log(`     Format: ${comp.format}`);
      if (comp.text) console.log(`     Text: ${comp.text?.substring(0, 100)}...`);
      if (comp.example) console.log(`     Example:`, JSON.stringify(comp.example));
      if (comp.buttons) console.log(`     Buttons:`, JSON.stringify(comp.buttons));
    });
    
    console.log('\n\nFull template JSON:');
    console.log(JSON.stringify(template, null, 2));
  } else {
    console.log('❌ Template not found or error:');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkTemplate().catch(console.error);
