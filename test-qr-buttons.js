require('dotenv').config({ path: '.env.local' });

const bridgeUrl = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://52.91.198.23:3333';
const bridgeSecret = process.env.WHATSAPP_WEB_BRIDGE_SECRET || 'swar-bridge-secret-2024';

// Template content
const templateContent = "*Swar Yoga Basic Program*\nIts Two days Program daily 2 hours,\nDate: *2nd and 3rd* Feb-26\nTime: 7.00 To 9.00 PM\nIts complete Health Program\n@ Just 145/- Rs\n\nSwar Yoga Team\n\n*Swar Yoga*";

// Build payload with BUTTONS type
const payload = {
  to: '919075358557',
  type: 'buttons',
  message: templateContent,
  buttons: ['I am Interested'],
  caption: 'Swar Yoga'
};

console.log('Sending BUTTONS via QR Bridge:', bridgeUrl);
console.log('Payload:', JSON.stringify(payload, null, 2));

fetch(bridgeUrl + '/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-bridge-secret': bridgeSecret
  },
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(d => console.log('Response:', JSON.stringify(d, null, 2)))
.catch(e => console.error('Error:', e.message));
