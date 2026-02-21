require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const crypto = require('crypto');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  
  // Get the template
  const template = await mongoose.connection.collection('whatsapp_templates').findOne({ templateName: 'feb_hindi_mor' });
  console.log('Template:', template.templateName);
  console.log('  headerFormat:', template.headerFormat);
  console.log('  headerMedia:', template.headerMedia?.url?.substring(0, 60) + '...');
  
  // Send via Meta API  
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const appSecret = process.env.META_APP_SECRET;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  const appsecret_proof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  
  const payload = {
    messaging_product: 'whatsapp',
    to: '919309986820',
    type: 'template',
    template: {
      name: template.templateName,
      language: { code: template.language || 'en_US' },
      components: [{
        type: 'header',
        parameters: [{
          type: 'image',
          image: { link: template.headerMedia.url }
        }]
      }]
    }
  };
  
  console.log('\nSending template via Meta API...');
  
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages?appsecret_proof=${appsecret_proof}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json();
  
  if (data.messages?.[0]?.id) {
    console.log('✓ SUCCESS! Message ID:', data.messages[0].id);
  } else {
    console.log('Response:', res.status, JSON.stringify(data, null, 2));
  }
  
  await mongoose.disconnect();
}

test().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
