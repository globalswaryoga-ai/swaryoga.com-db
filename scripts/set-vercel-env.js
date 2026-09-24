#!/usr/bin/env node

/**
 * Set Vercel Environment Variables Script
 * This script configures environment variables for production deployment
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const envVars = {
  // === Database ===
  MONGODB_URI_MAIN: process.env.MONGODB_URI_MAIN,
  MONGODB_CRM_DB_NAME: process.env.MONGODB_CRM_DB_NAME,
  MONGODB_MAIN_DB_NAME: process.env.MONGODB_MAIN_DB_NAME,

  // === WhatsApp Cloud API (Meta) ===
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  META_APP_SECRET: process.env.META_APP_SECRET,

  // === WhatsApp Bridge (macOS or EC2) ===
  // IMPORTANT: For production, update these to your bridge's public IP/domain
  NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL: process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || 'http://192.168.1.100:3333',
  WHATSAPP_BRIDGE_HTTP_URL: process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://192.168.1.100:3333',
  NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET: process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET,
  WHATSAPP_WEB_BRIDGE_SECRET: process.env.WHATSAPP_WEB_BRIDGE_SECRET,

  // === PayU (India Payments) ===
  PAYU_MERCHANT_KEY: process.env.PAYU_MERCHANT_KEY,
  PAYU_MERCHANT_SALT: process.env.PAYU_MERCHANT_SALT,
  PAYU_MODE: process.env.PAYU_MODE,

  // === QR Chat (waofficialapi.in) ===
  QR_CHAT_ENABLED: process.env.QR_CHAT_ENABLED || 'false',
  QR_CHAT_BASE_URL: process.env.QR_CHAT_BASE_URL,
  QR_CHAT_ACCESS_TOKEN: process.env.QR_CHAT_ACCESS_TOKEN,
  QR_CHAT_INSTANCE_ID: process.env.QR_CHAT_INSTANCE_ID,
  QR_CHAT_WEBHOOK_SECRET: process.env.QR_CHAT_WEBHOOK_SECRET,

  // === Authentication & Secrets ===
  JWT_SECRET: process.env.JWT_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'https://crm.swaryoga.com',

  // === External APIs ===
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,

  // === AWS S3 ===
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,

  // === Features ===
  WHATSAPP_DISABLE_WEB_BRIDGE: process.env.WHATSAPP_DISABLE_WEB_BRIDGE || 'false',
  NEXT_PUBLIC_ENABLE_META_WHATSAPP: process.env.NEXT_PUBLIC_ENABLE_META_WHATSAPP || 'true',
  SKIP_WEBHOOK_SIGNATURE: process.env.SKIP_WEBHOOK_SIGNATURE || 'false',
};

// Remove empty values
const filteredEnv = Object.fromEntries(
  Object.entries(envVars).filter(([_, v]) => v !== undefined && v !== '')
);

console.log('📋 Environment Variables for Vercel:\n');
console.log('Copy and paste these into Vercel Settings > Environment Variables:\n');
console.log('============================================================\n');

Object.entries(filteredEnv).forEach(([key, value]) => {
  // Mask sensitive values for display
  const display = value.length > 50 ? value.substring(0, 50) + '...' : value;
  console.log(`${key}=${display}`);
});

console.log('\n============================================================\n');

console.log('📝 Next Steps:\n');
console.log('1. Go to: https://vercel.com/swar-yoga-projects/swar-yoga-web-mohan/settings/environment-variables');
console.log('2. Add the environment variables above');
console.log('3. Make sure to set them for:\n');
console.log('   ✅ Production');
console.log('   ✅ Preview');
console.log('   ✅ Development\n');
console.log('4. Deploy the changes');
console.log('5. Test QR endpoint: https://crm.swaryoga.com/admin/crm/qr\n');

console.log('⚠️  IMPORTANT NOTES:\n');
console.log('- WHATSAPP_BRIDGE URLs: Currently set to 192.168.1.100:3333 (local Mac)');
console.log('  For production domain access, this must point to a publicly accessible bridge');
console.log('  (either EC2 IP, VPN IP, or ngrok tunnel)\n');
console.log('- Bridge Secret: Must match on both local and Vercel deployments\n');
console.log('- All sensitive values (tokens, keys) should be treated as secrets\n');

// Create .env.vercel file for reference
const envContent = Object.entries(filteredEnv)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

fs.writeFileSync(
  path.resolve(__dirname, '../.env.vercel.example'),
  `# Example Vercel Environment Variables\n# DO NOT COMMIT THIS FILE - it contains secrets!\n\n${envContent}`
);

console.log('✅ Created .env.vercel.example for reference (DO NOT COMMIT)\n');
