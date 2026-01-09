const fs = require('fs');
const content = fs.readFileSync('.env.local', 'utf8');

// The keys we want to extract
const keys = [
  'MONGODB_URI_MAIN',
  'MONGODB_CRM_DB_NAME',
  'MONGODB_MAIN_DB_NAME',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
  'META_APP_SECRET',
  'PAYU_MERCHANT_KEY',
  'PAYU_MERCHANT_SALT',
  'SKIP_WEBHOOK_SIGNATURE',
  'WHATSAPP_WEB_BRIDGE_SECRET',
  'WHATSAPP_ENABLE_CLOUD_SEND',
  'ADMIN_JWT_SECRET',
  'JWT_SECRET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET',
  'LOCALAUTH_DATA_PATH',
  'PAYU_MODE',
  'VERCEL_OIDC_TOKEN',
  'WHATSAPP_DISABLE_WEB_BRIDGE'
];

let found = {};

// Use regex to find all occurrences of each key and its value
// We look for KEY=VALUE where VALUE ends before the next KEY starts
keys.forEach(key => {
  // Regex: Find the key, then capture everything until either the end of string or another key starts
  // This is tricky because values can contain symbols.
  // But we know keys are all uppercase and usually follow a value.
  const regex = new RegExp(`${key}=`, 'g');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const start = match.index + key.length + 1;
    // Find where the next key starts
    let end = content.length;
    keys.forEach(otherKey => {
      const nextKeyIndex = content.indexOf(`${otherKey}=`, start);
      if (nextKeyIndex !== -1 && nextKeyIndex < end) {
        end = nextKeyIndex;
      }
    });
    
    let val = content.substring(start, end).trim();
    // Clean up any trailing garbage or whitespace
    val = val.split('\n')[0].split('\r')[0].trim();
    
    if (val && !found[key]) {
      found[key] = val;
    }
  }
});

let output = '';
keys.forEach(key => {
  if (found[key]) {
    output += `${key}=${found[key]}\n`;
  }
});

console.log('Final cleaned .env.local:');
console.log(output);
fs.writeFileSync('.env.local', output);
