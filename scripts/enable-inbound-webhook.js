const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const appSecret = process.env.META_APP_SECRET || '';
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Generate app secret proof
const appSecretProof = appSecret 
  ? crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex')
  : null;

console.log(`\n🔧 SUBSCRIBE TO INBOUND MESSAGES\n`);
console.log(`Phone ID: ${phoneId}\n`);

if (!appSecretProof) {
  console.log(`⚠️  WARNING: META_APP_SECRET not set in .env.local`);
  console.log(`   This may be optional but recommended.\n`);
}

// Build the cURL command
const curlCmd = `curl -X POST "https://graph.facebook.com/v24.0/${phoneId}/subscribed_fields" \\
  -H "Authorization: Bearer ${accessToken}" \\
  ${appSecretProof ? `-d "appsecret_proof=${appSecretProof}" \\` : ''}
  -d "subscribed_fields=messages,message_status,message_template_status_update,message_echo"`;

console.log(`📋 RUN THIS COMMAND IN YOUR TERMINAL:\n`);
console.log(curlCmd);
console.log(`\n${'═'.repeat(80)}\n`);

console.log(`✅ This will subscribe your webhook to receive:\n`);
console.log(`   1. messages              → Inbound WhatsApp messages`);
console.log(`   2. message_status        → Delivery/read receipts`);
console.log(`   3. message_template_status_update  → Template status`);
console.log(`   4. message_echo          → Echo of your sent messages\n`);

console.log(`⏱️  Wait 2-5 minutes after subscription for webhooks to start flowing.\n`);
console.log(`Then test with: https://wa.me/${phoneId.slice(-10)}?text=test\n`);

process.exit(0);