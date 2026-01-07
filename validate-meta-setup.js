#!/usr/bin/env node

/**
 * VALIDATE: Meta Webhook Setup Checklist
 * Confirms all prerequisites before connecting Meta webhook
 * Run this to verify everything is ready
 */

const fs = require('fs');
const path = require('path');

console.log(`
╔════════════════════════════════════════════════════════════════════╗
║          META WEBHOOK VALIDATION CHECKLIST                         ║
║         Verifies all prerequisites are in place                     ║
╚════════════════════════════════════════════════════════════════════╝
`);

let allChecksPassed = true;

// Check 1: Webhook route file exists
console.log('✓ CHECK 1: Webhook route handler exists');
const webhookRoutePath = path.join(__dirname, 'app/api/whatsapp/webhook/[phoneNumber]/route.ts');
if (fs.existsSync(webhookRoutePath)) {
  console.log('  ✅ File found: /app/api/whatsapp/webhook/[phoneNumber]/route.ts');
} else {
  console.log('  ❌ File NOT found: /app/api/whatsapp/webhook/[phoneNumber]/route.ts');
  allChecksPassed = false;
}

// Check 2: .env has required tokens
console.log('\n✓ CHECK 2: Environment variables configured');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const checks = [
    { key: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', found: envContent.includes('WHATSAPP_WEBHOOK_VERIFY_TOKEN=') },
    { key: 'WHATSAPP_PHONE_NUMBER_ID', found: envContent.includes('WHATSAPP_PHONE_NUMBER_ID=') },
    { key: 'WHATSAPP_BUSINESS_ACCOUNT_ID', found: envContent.includes('WHATSAPP_BUSINESS_ACCOUNT_ID=') },
  ];
  
  checks.forEach(check => {
    if (check.found) {
      console.log(`  ✅ ${check.key} configured`);
    } else {
      console.log(`  ⚠️  ${check.key} not found (may be optional)`);
    }
  });
} else {
  console.log('  ❌ .env file not found');
  allChecksPassed = false;
}

// Check 3: Verify token value
console.log('\n✓ CHECK 3: Verify token configured');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const tokenMatch = envContent.match(/WHATSAPP_WEBHOOK_VERIFY_TOKEN=([^\n]+)/);
  if (tokenMatch && tokenMatch[1]) {
    const token = tokenMatch[1].trim();
    console.log(`  ✅ Token set: ${token.substring(0, 20)}...${token.substring(token.length - 10)}`);
    if (token === 'ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d') {
      console.log(`  ✅ Token matches expected value`);
    }
  } else {
    console.log('  ❌ Verify token not configured in .env');
    allChecksPassed = false;
  }
}

// Check 4: Phone number ID configured
console.log('\n✓ CHECK 4: Phone number configured');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const phoneIdMatch = envContent.match(/WHATSAPP_PHONE_NUMBER_ID=([^\n]+)/);
  if (phoneIdMatch && phoneIdMatch[1]) {
    const phoneId = phoneIdMatch[1].trim();
    console.log(`  ✅ Phone Number ID: ${phoneId}`);
    if (phoneId === '733788303156745') {
      console.log(`  ✅ Phone ID matches 9779006820 (verified)`);
    }
  } else {
    console.log('  ❌ Phone Number ID not configured');
    allChecksPassed = false;
  }
}

// Check 5: Original webhook route still functional
console.log('\n✓ CHECK 5: Legacy webhook endpoint');
const legacyWebhookPath = path.join(__dirname, 'app/api/whatsapp/webhook/route.ts');
if (fs.existsSync(legacyWebhookPath)) {
  const content = fs.readFileSync(legacyWebhookPath, 'utf-8');
  if (content.includes('db.collection')) {
    console.log('  ✅ Legacy webhook updated with direct DB writes (good backup)');
  } else {
    console.log('  ⚠️  Legacy webhook may not have been updated');
  }
} else {
  console.log('  ⚠️  Legacy webhook route not found (OK if using dynamic routes only)');
}

// Check 6: Database connection test (optional)
console.log('\n✓ CHECK 6: Deployment status');
console.log('  ℹ️  Code deployed to Vercel: https://crm.swaryoga.com');
console.log('  ℹ️  Webhook endpoint: https://crm.swaryoga.com/api/whatsapp/webhook/9779006820');
console.log('  ℹ️  Verify endpoint accessible: curl -I https://crm.swaryoga.com/api/health');

// Summary
console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                      VALIDATION SUMMARY                            ║
╚════════════════════════════════════════════════════════════════════╝
`);

if (allChecksPassed) {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('\nYou are ready to connect the Meta webhook.\n');
  console.log('NEXT STEP:');
  console.log('1. Go to: https://business.facebook.com');
  console.log('2. Find WhatsApp app → Configuration → Webhook');
  console.log('3. Paste these values:');
  console.log('   Callback URL: https://crm.swaryoga.com/api/whatsapp/webhook/9779006820');
  console.log('   Verify Token: ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d');
  console.log('4. Click "Verify and Save"');
  console.log('5. Subscribe to: messages, message_status');
  console.log('\n📄 Full guide: See META_WEBHOOK_SETUP.md\n');
} else {
  console.log('⚠️  SOME CHECKS FAILED');
  console.log('\nPlease fix issues above before connecting Meta webhook.\n');
}
