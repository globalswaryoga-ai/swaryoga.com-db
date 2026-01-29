#!/usr/bin/env node
// Deep diagnosis of Meta WhatsApp delivery issues

const fs = require('fs');
const crypto = require('crypto');

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const [key, ...val] = line.split('=');
  if (key && !key.startsWith('#')) process.env[key.trim()] = val.join('=').trim();
}

const phone = process.argv[2] || '919309986820';

async function diagnose() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appSecret = process.env.META_APP_SECRET;
  const wabaId = process.env.WHATSAPP_WABA_ID || '1095304632815228';
  
  const appSecretProof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  
  console.log('DEEP DIAGNOSIS OF META WHATSAPP DELIVERY\n');
  console.log('='.repeat(60));
  
  // 1. Check phone number details
  console.log('\n1. PHONE NUMBER CONFIGURATION');
  const phoneUrl = `https://graph.facebook.com/v24.0/${phoneNumberId}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,messaging_limit_tier,platform_type&appsecret_proof=${appSecretProof}`;
  
  const phoneRes = await fetch(phoneUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const phoneData = await phoneRes.json();
  
  if (phoneData.error) {
    console.log('   Error:', phoneData.error.message);
  } else {
    console.log('   Display Number:', phoneData.display_phone_number);
    console.log('   Verified Name:', phoneData.verified_name);
    console.log('   Quality Rating:', phoneData.quality_rating);
    console.log('   Messaging Limit Tier:', phoneData.messaging_limit_tier);
    console.log('   Platform Type:', phoneData.platform_type);
  }
  
  // 2. Check WABA status
  console.log('\n2. WHATSAPP BUSINESS ACCOUNT STATUS');
  const wabaUrl = `https://graph.facebook.com/v24.0/${wabaId}?fields=name,currency,timezone_id,account_review_status,business_verification_status,ownership_type&appsecret_proof=${appSecretProof}`;
  
  const wabaRes = await fetch(wabaUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const wabaData = await wabaRes.json();
  
  if (wabaData.error) {
    console.log('   Error:', wabaData.error.message);
  } else {
    console.log('   Name:', wabaData.name);
    console.log('   Account Review:', wabaData.account_review_status);
    console.log('   Business Verification:', wabaData.business_verification_status);
  }
  
  // 3. Test sending a simple TEXT message (not template)
  console.log('\n3. TESTING SIMPLE TEXT MESSAGE');
  const sendUrl = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages?appsecret_proof=${appSecretProof}`;
  
  const textPayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'text',
    text: {
      preview_url: false,
      body: 'Test message from Swar Yoga - ' + new Date().toLocaleTimeString('en-IN')
    }
  };
  
  console.log('   Sending to:', phone);
  
  const textRes = await fetch(sendUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(textPayload)
  });
  
  const textData = await textRes.json();
  console.log('   Status:', textRes.status);
  
  if (textRes.ok && textData.messages) {
    console.log('   Text message accepted!');
    console.log('   Message ID:', textData.messages[0].id);
    console.log('   Message Status:', textData.messages[0].message_status);
  } else {
    console.log('   Text message failed');
    if (textData.error) {
      console.log('   Error Code:', textData.error.code);
      console.log('   Error:', textData.error.message);
      console.log('   Error SubCode:', textData.error.error_subcode);
    }
  }
  
  // 4. Check template status
  console.log('\n4. TEMPLATE STATUS ON META');
  const templateUrl = `https://graph.facebook.com/v24.0/${wabaId}/message_templates?name=swaryogabesic&appsecret_proof=${appSecretProof}`;
  
  const templateRes = await fetch(templateUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const templateData = await templateRes.json();
  
  if (templateData.data && templateData.data[0]) {
    const t = templateData.data[0];
    console.log('   Name:', t.name);
    console.log('   Status:', t.status);
    console.log('   Language:', t.language);
    console.log('   Quality Score:', t.quality_score ? t.quality_score.score : 'N/A');
    console.log('   Rejected Reason:', t.rejected_reason || 'None');
    
    const headerComp = t.components ? t.components.find(c => c.type === 'HEADER') : null;
    if (headerComp) {
      console.log('   Header Format:', headerComp.format);
    }
  } else {
    console.log('   Template not found or error');
  }
  
  // 5. Send template with image
  console.log('\n5. SENDING TEMPLATE WITH IMAGE');
  
  const imageUrl = 'https://swarygoal1hindi.s3.us-east-1.amazonaws.com/uploads/content-cache/fbe7b5d9bb30fd79b8197d759ff5edf7.jpg';
  
  const templatePayload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
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
              image: { link: imageUrl }
            }
          ]
        }
      ]
    }
  };
  
  const tplRes = await fetch(sendUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(templatePayload)
  });
  
  const tplData = await tplRes.json();
  console.log('   Status:', tplRes.status);
  console.log('   Response:', JSON.stringify(tplData, null, 2));
  
  if (tplRes.ok && tplData.messages) {
    console.log('\n   Template sent! Check phone:', phone);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('CHECK YOUR WHATSAPP ON:', phone);
}

diagnose().catch(console.error);
