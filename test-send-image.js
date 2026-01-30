require('dotenv').config({ path: '.env.local' });

const phone = '919309986820';
const token = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Test image URL (public image)
const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png';

console.log('📤 Sending image to', phone);
console.log('Phone ID:', phoneId);

fetch(`https://graph.facebook.com/v24.0/${phoneId}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'image',
    image: {
      link: imageUrl,
      caption: 'Test image from Copilot - ' + new Date().toISOString()
    }
  })
})
.then(r => r.json())
.then(data => {
  if (data.error) {
    console.log('❌ Error:', data.error.message);
    console.log('Code:', data.error.code);
  } else {
    console.log('✅ Image sent!');
    console.log('Message ID:', data.messages?.[0]?.id);
  }
})
.catch(e => console.log('❌ Fetch error:', e.message));
