#!/usr/bin/env node
// Deep diagnostic: Check Meta account status and template delivery issues

const fs = require('fs');
const crypto = require('crypto');

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const [key, ...val] = line.split('=');
  if (key && !key.startsWith('#')) process.env[key.trim()] = val.join('=').trim();
}

async function diagnose() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appSecret = process.env.META_APP_SECRET;
  const wabaId = process.env.WHATSAPP_WABA_ID || '1095304632815228';
  
  const appSecretProof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  
  console.log('🔍 DEEP META DIAGNOSTIC\n');
  console.log('='.repeat(50));
  
  // 1. Check WABA (WhatsApp Business Account) status
  console.log('\n1️⃣ Checking WhatsApp Business Account Status...');
  try {
    const wabaRes = await fetch(
      `https://graph.facebook.com/v24.0/${wabaId}?fields=id,name,currency,timezone_id,message_template_namespace,account_review_status,business_verification_status,ownership_type&appsecret_proof=${appSecretProof}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const wabaData = await wabaRes.json();
    console.log('   WABA ID:', wabaData.id);
    console.log('   Name:', wabaData.name);
    console.log('   Account Review Status:', wabaData.account_review_status);
    console.log('   Business Verification:', wabaData.business_verification_status);
    console.log('   Ownership Type:', wabaData.ownership_type);
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }
  
  // 2. Check Phone Number status and messaging limits
  console.log('\n2️⃣ Checking Phone Number Status & Limits...');
  try {
    const phoneRes = await fetch(
      `https://graph.facebook.com/v24.0/${phoneNumberId}?fields=verified_name,quality_rating,messaging_limit_tier,is_official_business_account,account_mode,status,current_limit,name_status,certificate,code_verification_status,display_phone_number&appsecret_proof=${appSecretProof}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const phoneData = await phoneRes.json();
    console.log('   Phone Number:', phoneData.display_phone_number);
    console.log('   Verified Name:', phoneData.verified_name);
    console.log('   Quality Rating:', phoneData.quality_rating);
    console.log('   Messaging Limit Tier:', phoneData.messaging_limit_tier);
    console.log('   Current Limit:', phoneData.current_limit);
    console.log('   Account Mode:', phoneData.account_mode);
    console.log('   Status:', phoneData.status);
    console.log('   Name Status:', phoneData.name_status);
    console.log('   Official Business Account:', phoneData.is_official_business_account);
    if (phoneData.error) {
      console.log('   ⚠️ Error:', phoneData.error.message);
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }
  
  // 3. Check template status on Meta
  console.log('\n3️⃣ Checking Template Status on Meta...');
  try {
    const templateRes = await fetch(
      `https://graph.facebook.com/v24.0/${wabaId}/message_templates?name=swaryogabesic&appsecret_proof=${appSecretProof}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const templateData = await templateRes.json();
    if (templateData.data && templateData.data[0]) {
      const t = templateData.data[0];
      console.log('   Template Name:', t.name);
      console.log('   Status:', t.status);
      console.log('   Quality Score:', t.quality_score?.score || 'N/A');
      console.log('   Category:', t.category);
      console.log('   Language:', t.language);
      if (t.rejected_reason) {
        console.log('   ⚠️ Rejected Reason:', t.rejected_reason);
      }
    } else {
      console.log('   ❌ Template not found');
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }
  
  // 4. Check conversation analytics
  console.log('\n4️⃣ Checking Recent Message Analytics...');
  try {
    const analyticsRes = await fetch(
      `https://graph.facebook.com/v24.0/${wabaId}?fields=analytics.start(1706400000).end(1738195200).granularity(DAY)&appsecret_proof=${appSecretProof}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const analyticsData = await analyticsRes.json();
    if (analyticsData.analytics) {
      console.log('   Analytics available');
    } else if (analyticsData.error) {
      console.log('   Analytics Error:', analyticsData.error.message);
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }
  
  // 5. Try sending to a DIFFERENT phone number to test
  console.log('\n5️⃣ Testing Template Send to DIFFERENT Number (9075358557)...');
  const testPhone = '919075358557'; // Different test number
  const imageUrl = 'https://swarygoal1hindi.s3.us-east-1.amazonaws.com/uploads/content-cache/fbe7b5d9bb30fd79b8197d759ff5edf7.jpg';
  
  try {
    const sendRes = await fetch(
      `https://graph.facebook.com/v24.0/${phoneNumberId}/messages?appsecret_proof=${appSecretProof}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: testPhone,
          type: 'template',
          template: {
            name: 'swaryogabesic',
            language: { code: 'en' },
            components: [
              {
                type: 'header',
                parameters: [{ type: 'image', image: { link: imageUrl } }]
              }
            ]
          }
        })
      }
    );
    const sendData = await sendRes.json();
    console.log('   Response Status:', sendRes.status);
    if (sendRes.ok && sendData.messages) {
      console.log('   ✅ Message Accepted!');
      console.log('   Message ID:', sendData.messages[0]?.id);
      console.log('   Message Status:', sendData.messages[0]?.message_status);
    } else {
      console.log('   ❌ Failed');
      console.log('   Error:', sendData.error?.message);
      console.log('   Error Code:', sendData.error?.code);
      console.log('   Error Subcode:', sendData.error?.error_subcode);
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }
  
  // 6. Try sending to the original number again
  console.log('\n6️⃣ Testing Template Send to ORIGINAL Number (9309986820)...');
  const originalPhone = '919309986820';
  
  try {
    const sendRes = await fetch(
      `https://graph.facebook.com/v24.0/${phoneNumberId}/messages?appsecret_proof=${appSecretProof}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: originalPhone,
          type: 'template',
          template: {
            name: 'swaryogabesic',
            language: { code: 'en' },
            components: [
              {
                type: 'header',
                parameters: [{ type: 'image', image: { link: imageUrl } }]
              }
            ]
          }
        })
      }
    );
    const sendData = await sendRes.json();
    console.log('   Response Status:', sendRes.status);
    if (sendRes.ok && sendData.messages) {
      console.log('   ✅ Message Accepted!');
      console.log('   Message ID:', sendData.messages[0]?.id);
      console.log('   Message Status:', sendData.messages[0]?.message_status);
      console.log('\n   📝 Note: Message was ACCEPTED by Meta. If not delivered,');
      console.log('      wait for webhook to show delivery status...');
    } else {
      console.log('   ❌ Failed');
      console.log('   Error:', sendData.error?.message);
      console.log('   Error Code:', sendData.error?.code);
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }
  
  // 7. Send a simple TEXT message to test basic messaging
  console.log('\n7️⃣ Testing Simple TEXT Message (not template)...');
  try {
    const textRes = await fetch(
      `https://graph.facebook.com/v24.0/${phoneNumberId}/messages?appsecret_proof=${appSecretProof}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: originalPhone,
          type: 'text',
          text: { body: '🔔 Test message from Swar Yoga - ' + new Date().toLocaleTimeString() }
        })
      }
    );
    const textData = await textRes.json();
    console.log('   Response Status:', textRes.status);
    if (textRes.ok && textData.messages) {
      console.log('   ✅ Text Message Accepted!');
      console.log('   Message ID:', textData.messages[0]?.id);
    } else {
      console.log('   ❌ Failed');
      console.log('   Error:', textData.error?.message);
      console.log('   Error Code:', textData.error?.code);
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 DIAGNOSIS COMPLETE');
  console.log('\nIf messages are ACCEPTED but not delivered, check:');
  console.log('1. User may have blocked the business number');
  console.log('2. Template frequency limits (same template to same user)');
  console.log('3. Wait 1-2 minutes and check webhook for delivery status');
}

diagnose().catch(console.error);
