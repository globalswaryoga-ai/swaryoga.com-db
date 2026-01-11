#!/usr/bin/env node
/**
 * Test real message send to Meta Cloud API
 * Usage: node test-meta-send-real.js <phone> <message>
 */

require('dotenv').config();
const crypto = require('crypto');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function testSend() {
  const phone = process.argv[2] || '919309986820';
  const message = process.argv[3] || 'Test from CRM - ' + new Date().toISOString();
  
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  
  if (!phoneNumberId || !accessToken) {
    console.error('❌ Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN');
    process.exit(1);
  }
  
  const appSecret = (process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '').trim();
  const appSecretProof = appSecret
    ? crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex')
    : null;

  const baseUrl = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`;
  const url = appSecretProof ? `${baseUrl}?appsecret_proof=${appSecretProof}` : baseUrl;
  console.log(`📤 Sending to: ${phone}`);
  console.log(`📝 Message: ${message}`);
  console.log(`🔗 URL: ${url}`);
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    });
    
    const data = await res.json();
    console.log(`\nStatus: ${res.status}`);
    console.log(JSON.stringify(data, null, 2));
    
    if (data?.messages?.[0]?.id) {
      console.log(`\n✅ Message sent! ID: ${data.messages[0].id}`);
    } else if (data?.error) {
      console.log(`\n❌ Error: ${data.error.message}`);
    }
  } catch (err) {
    console.error('❌ Request failed:', err.message);
  }
}

testSend();
