#!/usr/bin/env node
// Test sending via the CRM system (using buildCloudTemplateSendInput)

const fs = require('fs');
const crypto = require('crypto');

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');
for (const line of lines) {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#')) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
}

const phone = '919309986820';

// Simulate the template from DB (now with swaryogabesic)
const template = {
  templateName: 'swaryogabesic',
  language: 'en',
  headerFormat: 'IMAGE',
  headerMedia: {
    kind: 'image',
    url: 'https://swarygoal1hindi.s3.us-east-1.amazonaws.com/uploads/content-cache/fbe7b5d9bb30fd79b8197d759ff5edf7.jpg'
  },
  buttons: [
    { title: 'I am Interested', kind: 'quick_reply' }
  ]
};

// Replicate buildCloudTemplateSendInput logic
function buildCloudTemplateSendInput(template, to) {
  const headerMediaUrl = String(template?.headerMedia?.url || '').trim();
  const headerMediaKind = String(template?.headerMedia?.kind || '').trim();

  const headerMedia = headerMediaUrl && (headerMediaKind === 'image' || headerMediaKind === 'video')
    ? { kind: headerMediaKind, url: headerMediaUrl }
    : null;

  return {
    to,
    templateName: template.templateName,
    language: template.language || 'en',
    headerMedia,
    bodyParams: [],
    buttons: template.buttons || [],
  };
}

function buildTemplateComponents(input) {
  const components = [];

  if (input.headerMedia?.url) {
    const format = input.headerMedia.kind === 'video' ? 'VIDEO' : 'IMAGE';
    components.push({
      type: 'header',
      parameters: [
        {
          type: format.toLowerCase(),
          [format.toLowerCase()]: { link: input.headerMedia.url },
        },
      ],
    });
  }

  if (Array.isArray(input.bodyParams) && input.bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: input.bodyParams.map((p) => ({ type: 'text', text: String(p ?? '') })),
    });
  }

  return components;
}

async function sendTemplate() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appSecret = process.env.META_APP_SECRET;
  
  const appSecretProof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  const url = `https://graph.facebook.com/v24.0/${phoneNumberId}/messages?appsecret_proof=${appSecretProof}`;
  
  const cloudInput = buildCloudTemplateSendInput(template, phone);
  console.log('📋 Cloud Input:', JSON.stringify(cloudInput, null, 2));
  
  const components = buildTemplateComponents(cloudInput);
  console.log('\n📦 Components:', JSON.stringify(components, null, 2));
  
  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: cloudInput.templateName,
      language: { code: cloudInput.language },
      ...(components.length ? { components } : {}),
    },
  };
  
  console.log('\n📤 Sending to', phone, '...');
  console.log('📄 Payload:', JSON.stringify(payload, null, 2));
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const data = await res.json().catch(() => ({}));
  console.log('\n📊 Response:', res.status);
  console.log('📨 Data:', JSON.stringify(data, null, 2));
  
  if (res.ok && data.messages?.[0]?.id) {
    console.log('\n✅ SUCCESS! Message ID:', data.messages[0].id);
  } else {
    console.log('\n❌ Failed');
  }
}

sendTemplate().catch(console.error);
