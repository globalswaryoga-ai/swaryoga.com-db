const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const appSecret = 'ce4bf92f6be0c7bace755a216cbf1ef2';
const phoneNumberId = '918531901349959';
const testPhone = '919449869916';

const proof = crypto.createHmac('sha256', appSecret).update(token).digest('hex');

// Send template WITHOUT image header (use static image from template)
const payload = {
  messaging_product: 'whatsapp',
  to: testPhone,
  type: 'template',
  template: {
    name: 'swaryogabesic',
    language: { code: 'en' }
    // No components - use the static image already in template
  }
};

console.log('Sending payload (no image component):', JSON.stringify(payload, null, 2));

fetch('https://graph.facebook.com/v21.0/' + phoneNumberId + '/messages?appsecret_proof=' + proof, {
  method: 'POST',
  headers: { 
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(d => console.log('Response:', JSON.stringify(d, null, 2)))
.catch(e => console.error('Error:', e));
