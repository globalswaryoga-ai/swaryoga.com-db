const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const appSecret = process.env.META_APP_SECRET || 'ce4bf92f6be0c7bace755a216cbf1ef2';
const phoneNumberId = '918531901349959';
const testPhone = '919449869916'; // Test number

const proof = crypto.createHmac('sha256', appSecret).update(token).digest('hex');

// Send template with image header
const payload = {
  messaging_product: 'whatsapp',
  to: testPhone,
  type: 'template',
  template: {
    name: 'swaryogabesic',
    language: { code: 'en' },
    components: [
      {
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: { link: 'https://swarygoal1hindi.s3.us-east-1.amazonaws.com/uploads/content-cache/fbe7b5d9bb30fd79b8197d759ff5edf7.jpg' }
          }
        ]
      }
    ]
  }
};

console.log('Sending payload:', JSON.stringify(payload, null, 2));

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
