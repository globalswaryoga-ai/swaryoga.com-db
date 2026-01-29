require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

const phone = '919309986820';
const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const appSecret = process.env.META_APP_SECRET;

// Generate appsecret_proof
const appsecretProof = crypto.createHmac('sha256', appSecret).update(token).digest('hex');

console.log('Testing Meta API...');
console.log('Phone ID:', phoneId);
console.log('Has App Secret:', !!appSecret);

fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages?appsecret_proof=${appsecretProof}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'swaryogabesic',
      language: { code: 'en' }
    }
  })
})
.then(r => r.json())
.then(data => {
  if (data.error) {
    console.log('\n❌ Meta API Error:', data.error.message);
    console.log('Code:', data.error.code, '| Subcode:', data.error.error_subcode);
    
    if (data.error.code === 190) {
      console.log('\n→ Token expired! Need to generate new token from Meta Business Suite.');
    } else if (data.error.error_subcode === 2388093) {
      console.log('\n→ Payment issue! Add payment method in Meta Business Suite.');
    }
  } else {
    console.log('\n✅ META API IS WORKING!');
    console.log('Message ID:', data.messages?.[0]?.id);
    console.log('\n→ Blue buttons will work with Meta API templates!');
  }
})
.catch(e => console.log('❌ Error:', e.message));
