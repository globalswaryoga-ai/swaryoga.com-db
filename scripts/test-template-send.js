/**
 * Test template sending via Meta Cloud API
 * Run: node scripts/test-template-send.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const crypto = require('crypto');

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;

// Test recipient phone number (your own number for testing)
const TEST_PHONE = '919309986820'; // Change to your number

function generateAppSecretProof(accessToken, appSecret) {
  if (!appSecret) return '';
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

async function testTemplateSend() {
  console.log('=== Testing Template Send ===');
  console.log('Phone Number ID:', PHONE_NUMBER_ID);
  console.log('Access Token:', ACCESS_TOKEN ? '✅ SET' : '❌ MISSING');
  console.log('App Secret:', APP_SECRET ? '✅ SET' : '❌ MISSING');
  
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('❌ Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN');
    return;
  }

  // Connect to DB to get template details
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  
  const template = await mongoose.connection.collection('whatsapp_templates')
    .findOne({ templateName: 'feb_hindi_mor' });
  
  if (!template) {
    console.error('❌ Template not found');
    await mongoose.disconnect();
    return;
  }
  
  console.log('\n=== Template Details ===');
  console.log('Name:', template.templateName);
  console.log('Language:', template.language);
  console.log('Status:', template.status);
  console.log('Header Format:', template.headerFormat);
  console.log('Image URL:', template.imageFile?.url || template.headerMedia?.url || 'NONE');
  console.log('Buttons:', JSON.stringify(template.buttons));
  
  // Build components array for IMAGE header
  const components = [];
  const imageUrl = template.headerMedia?.url || template.imageFile?.url || template.headerContent;
  
  if (template.headerFormat === 'IMAGE' && imageUrl) {
    // Use public S3 URL directly (bucket is already public)
    console.log('\n=== Adding Image Header ===');
    console.log('Using image URL:', imageUrl);
    
    components.push({
      type: 'header',
      parameters: [
        {
          type: 'image',
          image: { link: imageUrl }
        }
      ]
    });
    console.log('Header component added with image');
  }
  
  // Build payload WITH components
  const appSecretProof = generateAppSecretProof(ACCESS_TOKEN, APP_SECRET);
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages?appsecret_proof=${appSecretProof}`;
  
  const payload = {
    messaging_product: 'whatsapp',
    to: TEST_PHONE,
    type: 'template',
    template: {
      name: template.templateName,
      language: { code: template.language || 'en_US' },
      ...(components.length > 0 ? { components } : {}),
    },
  };
  
  console.log('\n=== Sending Template ===');
  console.log('URL:', url.replace(ACCESS_TOKEN, 'TOKEN_HIDDEN'));
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const data = await res.json();
    console.log('\n=== Response ===');
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(data, null, 2));
    
    if (data.messages && data.messages[0]?.id) {
      console.log('\n✅ SUCCESS! Message ID:', data.messages[0].id);
    } else if (data.error) {
      console.log('\n❌ ERROR:', data.error.message || data.error);
      console.log('Error code:', data.error.code);
      console.log('Error details:', JSON.stringify(data.error, null, 2));
    }
  } catch (err) {
    console.error('\n❌ Fetch Error:', err.message);
  }
  
  await mongoose.disconnect();
}

testTemplateSend().catch(console.error);
