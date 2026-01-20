#!/usr/bin/env node
/**
 * Register a WhatsApp Business Phone Number for Meta Cloud API.
 * This is required when you first add a number or if you get "Account not registered" error.
 */

require('dotenv').config({ path: '.env.local' });
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const crypto = require('crypto');

async function registerNumber() {
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const appSecret = (process.env.META_APP_SECRET || '').trim();

  if (!phoneNumberId || !accessToken) {
    console.error('❌ Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in .env.local');
    process.exit(1);
  }

  const appSecretProof = appSecret
    ? crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex')
    : null;

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/register${appSecretProof ? '?appsecret_proof=' + appSecretProof : ''}`;

  console.log(`🚀 Attempting to register Phone ID: ${phoneNumberId}`);
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
        pin: '123456' // You might need to change this if you set a different PIN in Meta Dashboard
      }),
    });

    const data = await res.json();
    console.log(`\nStatus: ${res.status}`);
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Registration successful! Your number is now active on the Cloud API.');
    } else {
      console.log('\n❌ Registration failed. Check the error above.');
      if (data.error?.message?.includes('registered')) {
        console.log('💡 Note: If it says it is already registered, then the issue might be something else.');
      }
    }
  } catch (err) {
    console.error('❌ Request failed:', err.message);
  }
}

registerNumber();
