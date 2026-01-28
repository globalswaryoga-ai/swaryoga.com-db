const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const token = process.env.WHATSAPP_ACCESS_TOKEN;
const appSecret = 'ce4bf92f6be0c7bace755a216cbf1ef2';
const phoneNumberId = '918531901349959';
const testPhone = '919449869916';

const proof = crypto.createHmac('sha256', appSecret).update(token).digest('hex');

// Try with a different public image that's known to work
// Using a simple placeholder image
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
            image: { 
              // Use a well-known public image
              link: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800'
            }
          }
        ]
      }
    ]
  }
};

console.log('Sending with different image...');

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
