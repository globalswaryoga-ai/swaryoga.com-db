// Check Meta template configuration via Graph API
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

function generateAppSecretProof(accessToken, appSecret) {
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

async function checkMetaTemplate() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
  const wabaId = process.env.WHATSAPP_WABA_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  
  if (!accessToken) {
    console.error('Missing WHATSAPP_ACCESS_TOKEN');
    return;
  }
  
  if (!appSecret) {
    console.error('Missing META_APP_SECRET');
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SECRET') || k.includes('APP')));
    return;
  }
  
  if (!wabaId) {
    console.error('Missing WHATSAPP_WABA_ID or WHATSAPP_BUSINESS_ACCOUNT_ID');
    return;
  }
  
  const templateName = 'swaryogabesic';
  const appSecretProof = generateAppSecretProof(accessToken, appSecret);
  
  // Get template details from Meta
  const url = `https://graph.facebook.com/v18.0/${wabaId}/message_templates?name=${templateName}&fields=name,status,category,language,components&appsecret_proof=${appSecretProof}`;
  
  console.log('Fetching template from Meta...');
  console.log('WABA ID:', wabaId);
  console.log('Template Name:', templateName);
  
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    const data = await res.json();
    
    if (data.error) {
      console.error('Meta API error:', data.error);
      return;
    }
    
    console.log('\n=== META TEMPLATE CONFIGURATION ===');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.data && data.data.length > 0) {
      const template = data.data[0];
      console.log('\n=== TEMPLATE ANALYSIS ===');
      console.log('Template Name:', template.name);
      console.log('Status:', template.status);
      console.log('Category:', template.category);
      console.log('Language:', template.language);
      
      console.log('\n=== COMPONENTS ===');
      template.components?.forEach((comp, i) => {
        console.log(`\nComponent ${i + 1} (${comp.type}):`);
        if (comp.type === 'HEADER') {
          console.log('  Format:', comp.format);
          if (comp.format === 'IMAGE') {
            console.log('  ✅ Template has IMAGE header');
          } else if (comp.format === 'TEXT') {
            console.log('  ⚠️ Template has TEXT header only - no image will show');
          }
        }
        if (comp.type === 'BODY') {
          console.log('  Text:', comp.text?.substring(0, 100) + '...');
        }
        if (comp.type === 'BUTTONS') {
          console.log('  Buttons:');
          comp.buttons?.forEach((btn, j) => {
            console.log(`    ${j + 1}. ${btn.type}: ${btn.text}`);
          });
        }
      });
    } else {
      console.log('Template not found in Meta!');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkMetaTemplate();
