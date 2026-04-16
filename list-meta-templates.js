#!/usr/bin/env node

/**
 * List all WhatsApp templates from Meta
 */

const crypto = require('crypto');
require('dotenv').config();

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function getTemplates() {
  try {
    // Get WABA ID from phone number ID
    const phoneRes = await fetch(`https://graph.instagram.com/v24.0/${WHATSAPP_PHONE_NUMBER_ID}?fields=wa_business_account_id&access_token=${WHATSAPP_ACCESS_TOKEN}`);
    const phoneData = await phoneRes.json();
    const wabaId = phoneData.wa_business_account_id;

    console.log('📋 Meta WhatsApp Templates');
    console.log('==========================\n');
    console.log(`WABA ID: ${wabaId}`);
    console.log(`Phone ID: ${WHATSAPP_PHONE_NUMBER_ID}\n`);

    // List templates
    const templatesUrl = `https://graph.instagram.com/v24.0/${wabaId}/message_templates?fields=name,status&access_token=${WHATSAPP_ACCESS_TOKEN}`;
    const templatesRes = await fetch(templatesUrl);
    const templatesData = await templatesRes.json();

    if (templatesData.error) {
      console.error('❌ Error:', templatesData.error.message);
      return;
    }

    if (!templatesData.data || templatesData.data.length === 0) {
      console.log('❌ No templates found');
      return;
    }

    console.log(`✅ Found ${templatesData.data.length} templates:\n`);
    templatesData.data.forEach((t, i) => {
      console.log(`${i + 1}. ${t.name}`);
      console.log(`   Status: ${t.status}\n`);
    });

    console.log('\n💡 Available for Sadhana scheduler:');
    const approvedTemplates = templatesData.data.filter(t => t.status === 'APPROVED');
    if (approvedTemplates.length > 0) {
      console.log(`✅ Use any of these templates (${approvedTemplates.length} approved)`);
    } else {
      console.log('⚠️  No approved templates. You need to:');
      console.log('   1. Create a template in Meta Business Manager');
      console.log('   2. Get it approved by Meta');
      console.log('   3. Then update Sadhana scheduler to use it');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

getTemplates();
