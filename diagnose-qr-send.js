#!/usr/bin/env node

/**
 * Diagnose QR Message Send Issues
 * Tests the endpoint validation and payload structure
 */

const http = require('http');
const https = require('https');

const API_URL = 'https://crm.swaryoga.com/api/admin/crm/whatsapp/qr/send';

// Example valid payload
const testPayload = {
  to: '919876543210@c.us', // Must be in WhatsApp format
  message: 'Test message from diagnostic',
  type: 'text',
  leadId: '67abc123def456ghi789'
};

console.log('🔍 QR Send Endpoint Diagnostic\n');
console.log('Testing:', API_URL);
console.log('Payload:', JSON.stringify(testPayload, null, 2));
console.log('\n📋 Checking structure...\n');

const issues = [];

// 1. Check `to` field
if (!testPayload.to) {
  issues.push('❌ Missing `to` field');
} else if (typeof testPayload.to !== 'string') {
  issues.push('❌ `to` must be a string');
} else if (!testPayload.to.includes('@')) {
  issues.push('❌ `to` must be in WhatsApp format (e.g., 919876543210@c.us or group@g.us)');
}

// 2. Check `message` field for text type
if (testPayload.type === 'text') {
  if (!testPayload.message) {
    issues.push('❌ Missing `message` field for type=text');
  } else if (typeof testPayload.message !== 'string') {
    issues.push('❌ `message` must be a string');
  }
}

// 3. Check `type` field
const validTypes = ['text', 'image', 'video', 'audio', 'document', 'buttons'];
if (!testPayload.type) {
  issues.push('❌ Missing `type` field');
} else if (!validTypes.includes(testPayload.type)) {
  issues.push(`❌ Invalid \`type\`. Must be one of: ${validTypes.join(', ')}`);
}

// 4. For media types, check `url` and `caption`
if (['image', 'video', 'audio', 'document'].includes(testPayload.type) && !testPayload.url) {
  issues.push(`❌ Missing \`url\` field for type=${testPayload.type}`);
}

if (issues.length > 0) {
  console.log('⚠️  Issues found:\n');
  issues.forEach(issue => console.log('   ' + issue));
  console.log('\n');
} else {
  console.log('✅ Payload structure looks valid!\n');
}

console.log('📝 Common ChatId Formats:\n');
console.log('   Individual: 919876543210@c.us');
console.log('   Group:      120363123456789@g.us\n');

console.log('🔧 Frontend checklist:\n');
console.log('   1. Extract phone from chatId and format as: phone@c.us');
console.log('   2. Ensure `message` is not empty for text type');
console.log('   3. Pass `leadId` if available for access control');
console.log('   4. Include authorization header with valid token\n');

console.log('🌉 Bridge URL should be set in .env.local:');
console.log('   WHATSAPP_BRIDGE_HTTP_URL=http://52.91.198.23:3333\n');

console.log('✨ Next steps:\n');
console.log('   1. Open browser DevTools Network tab');
console.log('   2. Send a message in QR chat');
console.log('   3. Check POST /api/admin/crm/whatsapp/qr/send request');
console.log('   4. Verify request body matches expected format');
console.log('   5. Check response status and error message\n');
