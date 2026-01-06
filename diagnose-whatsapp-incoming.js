#!/usr/bin/env node

/**
 * WhatsApp Incoming Messages Diagnostic Script
 * Checks configuration and connectivity for 9779006820
 * 
 * Usage: node diagnose-whatsapp-incoming.js
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function section(title) {
  console.log('');
  log(`╔${'═'.repeat(70)}╗`, 'cyan');
  log(`║ ${title.padEnd(68)} ║`, 'cyan');
  log(`╚${'═'.repeat(70)}╝`, 'cyan');
}

function check(label, pass, detail = '') {
  const status = pass ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
  console.log(`  ${status}  ${label}`);
  if (detail) console.log(`         ${colors.yellow}${detail}${colors.reset}`);
}

function warn(msg) {
  log(`  ⚠️  ${msg}`, 'yellow');
}

function info(msg) {
  log(`  ℹ️  ${msg}`, 'cyan');
}

// Load environment
const envPath = path.join(__dirname, '.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = {};
envContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#')) {
    const value = valueParts.join('=').replace(/^["']|["']$/g, '').trim();
    env[key.trim()] = value;
  }
});

// Diagnostic results
let criticalIssues = 0;
let warnings = 0;

section('WhatsApp Incoming Messages Diagnostics (9779006820)');

// 1. Webhook Configuration
section('1. WEBHOOK CONFIGURATION');

const verifyToken = env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
const criticalToken = verifyToken && verifyToken.length > 0;
check('WHATSAPP_WEBHOOK_VERIFY_TOKEN is set', criticalToken, 
  criticalToken ? `Length: ${verifyToken.length} chars` : 'CRITICAL: Messages cannot be received');
if (!criticalToken) criticalIssues++;

const appSecret = env.META_APP_SECRET || env.WHATSAPP_APP_SECRET;
const hasAppSecret = appSecret && appSecret.length > 0;
check('META_APP_SECRET or WHATSAPP_APP_SECRET is set', hasAppSecret,
  hasAppSecret ? `Length: ${appSecret.length} chars` : 'WARNING: Webhook will not verify signature');
if (!hasAppSecret) warnings++;

// 2. Phone Number Configuration
section('2. PHONE NUMBER CONFIGURATION');

const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
const hasPhoneId = phoneNumberId && phoneNumberId.length > 0;
check('WHATSAPP_PHONE_NUMBER_ID is set', hasPhoneId,
  hasPhoneId ? `ID: ${phoneNumberId.substring(0, 8)}...` : 'CRITICAL: Webhook does not know which phone');
if (!hasPhoneId) criticalIssues++;

const businessToken = env.WHATSAPP_ACCESS_TOKEN || env.WHATSAPP_BUSINESS_TOKEN;
const hasAccessToken = businessToken && businessToken.length > 0;
check('WHATSAPP_ACCESS_TOKEN or WHATSAPP_BUSINESS_TOKEN is set', hasAccessToken,
  hasAccessToken ? `Token length: ${businessToken.length} chars` : 'WARNING: Cannot verify phone is connected');
if (!hasAccessToken) warnings++;

// 3. Cloud API vs Web Bridge
section('3. INTEGRATION METHOD');

const bridgeUrl = env.WHATSAPP_BRIDGE_HTTP_URL;
const bridgeSecret = env.WHATSAPP_WEB_BRIDGE_SECRET;
const hasBridge = bridgeUrl && bridgeUrl.length > 0;

const enableCloud = String(env.WHATSAPP_ENABLE_CLOUD_SEND || '').toLowerCase();
const cloudEnabled = ['1', 'true', 'yes', 'on'].includes(enableCloud);

const disableCloud = String(
  env.WHATSAPP_DISABLE_META_SEND || 
  env.WHATSAPP_DISABLE_CLOUD_SEND || 
  env.WHATSAPP_FORCE_WEB_BRIDGE || 
  ''
).toLowerCase();
const cloudDisabled = ['1', 'true', 'yes', 'on'].includes(disableCloud);

check('Cloud API preferred for incoming', !cloudDisabled && hasAccessToken && hasPhoneId);
if (hasBridge && bridgeSecret) {
  check('WhatsApp Web Bridge configured (fallback)', true, 
    `URL: ${bridgeUrl}, Secret: ${bridgeSecret.substring(0, 10)}...`);
} else {
  check('WhatsApp Web Bridge configured (fallback)', false, 'Optional but recommended for testing');
}

// 4. Database Configuration
section('4. DATABASE CONFIGURATION');

const mongoUri = env.MONGODB_URI;
const hasDb = mongoUri && mongoUri.length > 0;
check('MONGODB_URI is set', hasDb,
  hasDb ? `Host: ${mongoUri.includes('@') ? mongoUri.split('@')[1].split('/')[0] : 'local'}` : 'CRITICAL: Cannot store messages');
if (!hasDb) criticalIssues++;

const mainDb = env.MONGODB_MAIN_DB_NAME || env.MONGODB_URI?.match(/\/([^?]+)/)?.[1];
info(`Database name: ${mainDb || 'swaryogaDB (default)'}`);

// 5. JWT & Auth
section('5. AUTHENTICATION');

const jwtSecret = env.JWT_SECRET;
const hasJwt = jwtSecret && jwtSecret.length > 0;
check('JWT_SECRET is set', hasJwt,
  hasJwt ? `Length: ${jwtSecret.length} chars` : 'Warning: Auth will fail');

// 6. Recommended callback URL
section('6. CALLBACK URL SETUP');

info('Set this in Meta App Dashboard → Messenger → Webhooks:');
log(`  Callback URL: https://<your-domain>/api/whatsapp/webhook`, 'cyan');
log(`  Verify Token: ${verifyToken || '<from WHATSAPP_WEBHOOK_VERIFY_TOKEN>'}`, 'cyan');
info('Replace <your-domain> with your actual domain (e.g., swaryoga.com)');

// 7. Troubleshooting hints
section('7. QUICK FIXES');

if (!criticalToken) {
  log('\n  🔧 FIX 1: Generate WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'yellow');
  log(`    Command: openssl rand -hex 32`, 'yellow');
  log(`    Then add to .env: WHATSAPP_WEBHOOK_VERIFY_TOKEN="<generated>"`, 'yellow');
}

if (!hasPhoneId) {
  log('\n  🔧 FIX 2: Get WHATSAPP_PHONE_NUMBER_ID', 'yellow');
  log(`    1. Go to Meta Business Manager → Settings → Phone Numbers`, 'yellow');
  log(`    2. Find 9779006820 and copy its Phone Number ID`, 'yellow');
  log(`    3. Add to .env: WHATSAPP_PHONE_NUMBER_ID="120XXXXXXXXXX"`, 'yellow');
}

if (!hasAppSecret) {
  log('\n  🔧 FIX 3: Get META_APP_SECRET', 'yellow');
  log(`    1. Go to Meta App Dashboard → Settings → Basic`, 'yellow');
  log(`    2. Find App Secret (click Show)`, 'yellow');
  log(`    3. Add to .env: META_APP_SECRET="<secret>"`, 'yellow');
}

if (!hasDb) {
  log('\n  🔧 FIX 4: Set MONGODB_URI', 'yellow');
  log(`    Add to .env: MONGODB_URI="mongodb+srv://user:pass@host/dbname"`, 'yellow');
}

// 8. Summary
section('SUMMARY');

if (criticalIssues === 0 && warnings === 0) {
  log('✅ All critical checks passed!', 'green');
  log('Your WhatsApp webhook should be ready to receive messages.', 'green');
  log('', 'green');
  log('Next steps:', 'cyan');
  log('  1. Verify webhook URL in Meta App Dashboard', 'cyan');
  log('  2. Send a test message to 9779006820 from a personal WhatsApp', 'cyan');
  log('  3. Check Admin CRM panel → Messages (should appear instantly)', 'cyan');
} else {
  if (criticalIssues > 0) {
    log(`❌ ${criticalIssues} critical issue(s) found`, 'red');
    log('   Incoming messages WILL NOT be received until fixed.', 'red');
  }
  if (warnings > 0) {
    log(`⚠️  ${warnings} warning(s) found`, 'yellow');
    log('   Webhook may not work reliably. Recommended to fix.', 'yellow');
  }
  log('', 'reset');
  log('👉 See WHATSAPP_INCOMING_MESSAGES_TROUBLESHOOTING.md for detailed fixes', 'cyan');
}

console.log('');

// Exit code
process.exit(criticalIssues > 0 ? 1 : 0);
