const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const appSecret = process.env.META_APP_SECRET || '';
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;

console.log(`\n🔍 FINDING WHATSAPP BUSINESS ACCOUNT ID\n`);

// Step 1: Get phone number details to find account ID
console.log(`Step 1️⃣ : Get Phone Details\n`);
console.log(`API Call: GET /v24.0/${phoneId}`);
console.log(`\nCommand:\n`);

const getPhoneCmd = `curl -s "https://graph.facebook.com/v24.0/${phoneId}?fields=account_id&access_token=${accessToken}" | jq '.'`;

console.log(getPhoneCmd);
console.log(`\n${'═'.repeat(80)}\n`);

console.log(`Step 2️⃣ : Subscribe to Webhook Fields\n`);
console.log(`Once you have the account_id from Step 1, run:\n`);

const appSecretProof = appSecret 
  ? crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex')
  : null;

console.log(`curl -X POST "https://graph.facebook.com/v24.0/{account_id}/subscribed_fields" \\`);
console.log(`  -H "Authorization: Bearer ${accessToken.substring(0, 20)}..." \\`);
if (appSecretProof) {
  console.log(`  -d "appsecret_proof=${appSecretProof}" \\`);
}
console.log(`  -d "subscribed_fields=messages,message_status,message_template_status_update,message_echo"`);

console.log(`\n${'═'.repeat(80)}\n`);

console.log(`⚠️  ALTERNATIVE: Use Meta Dashboard (More Reliable)\n`);
console.log(`1. Go to: https://developers.facebook.com/apps/${appId || 'YOUR_APP_ID'}`);
console.log(`2. Navigate to: WhatsApp > Configuration`);
console.log(`3. Scroll to: Webhook Fields`);
console.log(`4. Check these boxes:`);
console.log(`   ☑ messages`);
console.log(`   ☑ message_status`);
console.log(`   ☑ message_template_status_update`);
console.log(`   ☑ message_echo`);
console.log(`5. Click: Save\n`);

process.exit(0);