#!/usr/bin/env node
/**
 * Check current webhook configuration and phone number setup
 */

require('dotenv').config();

console.log('\n╔════════════════════════════════════════════╗');
console.log('║      CURRENT WEBHOOK CONFIGURATION        ║');
console.log('╚════════════════════════════════════════════╝\n');

console.log('📱 WHATSAPP PHONE NUMBER IDs:\n');

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
console.log('  Primary Phone Number ID:');
console.log('    ' + (phoneNumberId || 'NOT SET'));

console.log('\n🔗 WEBHOOK CONFIGURATION:\n');

const webhookToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
console.log('  Webhook Verify Token:');
console.log('    ' + (webhookToken ? webhookToken.substring(0, 20) + '...' : 'NOT SET'));

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
console.log('\n  Access Token:');
console.log('    ' + (accessToken ? accessToken.substring(0, 20) + '...' : 'NOT SET'));

const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
console.log('\n  App Secret:');
console.log('    ' + (appSecret ? appSecret.substring(0, 20) + '...' : 'NOT SET'));

console.log('\n🌐 WEBHOOK ENDPOINT:\n');
console.log('  POST /api/whatsapp/webhook');
console.log('  Verify token: ' + webhookToken);

console.log('\n📋 META BUSINESS PLATFORM CHECK:\n');

console.log('  To verify configuration in Meta:');
console.log('  1. Go to https://business.facebook.com');
console.log('  2. Select Your WhatsApp App');
console.log('  3. Settings → Configuration');
console.log('  4. Look for Webhook URL');
console.log('  5. Verify it points to: https://crm.swaryoga.com/api/whatsapp/webhook');
console.log('  6. Check the Phone Number ID');

console.log('\n⚠️  TO FIX OVERLAPPING ISSUE:\n');

console.log('  You may need SEPARATE webhook URLs for EACH phone number:');
console.log('  - 9779006820 (ID: 733788303156745) → https://crm.swaryoga.com/api/whatsapp/webhook');
console.log('  - 9075358557 (ID: ???) → https://crm.swaryoga.com/api/whatsapp/webhook');
console.log('');
console.log('  OR configure both to use the SAME webhook endpoint');
console.log('  but ensure the webhook correctly routes by phone number');
console.log('');
