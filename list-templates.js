#!/usr/bin/env node
// List all templates on Meta

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

async function listTemplates() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WHATSAPP_WABA_ID || '1095304632815228';
  const appSecret = process.env.META_APP_SECRET;
  
  const appSecretProof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  
  const url = `https://graph.facebook.com/v24.0/${wabaId}/message_templates?limit=50&appsecret_proof=${appSecretProof}`;
  
  console.log('🔍 Listing all templates on Meta...\n');
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const data = await res.json().catch(() => ({}));
  
  if (data.data && data.data.length > 0) {
    console.log(`Found ${data.data.length} templates:\n`);
    
    data.data.forEach((template, i) => {
      const hasImageHeader = template.components?.some(c => c.type === 'HEADER' && c.format === 'IMAGE');
      console.log(`${i + 1}. ${template.name}`);
      console.log(`   Status: ${template.status}`);
      console.log(`   Language: ${template.language}`);
      console.log(`   Has Image Header: ${hasImageHeader ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });
  } else {
    console.log('❌ No templates found or error:');
    console.log(JSON.stringify(data, null, 2));
  }
}

listTemplates().catch(console.error);
