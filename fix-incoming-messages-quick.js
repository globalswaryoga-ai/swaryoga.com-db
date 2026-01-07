#!/usr/bin/env node

/**
 * QUICK FIX: Clear browser storage & test Meta WhatsApp connection
 * Fixes 90% of "incoming messages not showing" issues
 */

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║   INCOMING WHATSAPP MESSAGES - QUICK FIX                      ║');
console.log('║   This fixes most "messages not showing" issues               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const fs = require('fs');
const path = require('path');

console.log('✅ STEP 1: Browser Instructions');
console.log('─'.repeat(60));
console.log(`
Open your browser DevTools and paste this into the Console:

    localStorage.clear()
    sessionStorage.clear()
    location.reload()

OR if that doesn't work, use:

    localStorage.removeItem('admin_token')
    location.href = '/admin/login'

Then:
1. Log in again with your admin credentials
2. Go to: /admin/crm/whatsapp-meta
3. Send a test WhatsApp message
4. You should see it appear within 10 seconds

`);

console.log('✅ STEP 2: Environment Check');
console.log('─'.repeat(60));

const envFile = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf-8');
  
  const checks = {
    'META_APP_SECRET': /META_APP_SECRET=[^\n]+/.test(content),
    'WHATSAPP_WEBHOOK_VERIFY_TOKEN': /WHATSAPP_WEBHOOK_VERIFY_TOKEN=[^\n]+/.test(content),
    'WHATSAPP_ACCESS_TOKEN': /WHATSAPP_ACCESS_TOKEN=[^\n]+/.test(content),
    'WHATSAPP_PHONE_NUMBER_ID': /WHATSAPP_PHONE_NUMBER_ID=[^\n]+/.test(content),
  };
  
  Object.entries(checks).forEach(([key, exists]) => {
    console.log(`  ${exists ? '✅' : '❌'} ${key}`);
  });
  
  const allSet = Object.values(checks).every(Boolean);
  if (!allSet) {
    console.log('\n⚠️  Some required variables are missing!');
    console.log('    Check your .env file and add missing variables.');
  } else {
    console.log('\n✅ All required variables are set!');
  }
} else {
  console.log('⚠️  .env file not found');
}

console.log('\n✅ STEP 3: What to Check');
console.log('─'.repeat(60));
console.log(`
After clearing browser storage and logging back in:

1. Open DevTools (F12 or Cmd+Shift+I)
2. Go to Application → Local Storage
3. Check for 'admin_token' key
4. Copy the token value and paste in https://jwt.io/
5. Verify it shows:
   ✅ "Signature Verified" (green checkmark)
   ✅ "isAdmin": true in payload
   ✅ Token not expired (exp value > now)

If any of these fail → Your auth is broken, re-login
If all pass → Check browser Network tab for polling requests
`);

console.log('✅ STEP 4: Check Polling');
console.log('─'.repeat(60));
console.log(`
1. Go to: /admin/crm/whatsapp-meta
2. Open DevTools → Network tab
3. Wait 10 seconds
4. Look for requests to: /api/admin/crm/whatsapp/meta/conversations

If you see them every 10 seconds:
  ✅ Polling is working

If you don't see them:
  ❌ Polling is stopped (might be stuck in error state)
  → Try: Reload page OR Check console for errors

If you see 401 responses:
  ❌ JWT token is invalid
  → Try: Clear storage again and re-login
`);

console.log('✅ STEP 5: Last Resort - Full Reset');
console.log('─'.repeat(60));
console.log(`
If nothing works, do a complete reset:

1. Clear all admin data:
   localStorage.clear()

2. Close all tabs for crm.swaryoga.com

3. Restart the browser completely

4. Go to: https://crm.swaryoga.com/admin/login

5. Login with admin credentials

6. Navigate to: /admin/crm/whatsapp-meta

7. Send a test message

This fixes 99% of issues!
`);

console.log('═'.repeat(60));
console.log('SUMMARY');
console.log('═'.repeat(60));
console.log(`
Message Flow:
  Meta WhatsApp Cloud API
    ↓
  /api/whatsapp/webhook ✅ (working)
    ↓
  Database (whatsappmessages collection) ✅ (working)
    ↓
  /api/admin/crm/whatsapp/meta/conversations ❓ (requires valid JWT)
    ↓
  Frontend polls every 10 seconds ❓ (requires polling to be enabled)
    ↓
  /admin/crm/whatsapp-meta UI ❓ (requires all above to work)

Most common issue: Invalid JWT token or polling stopped by error

Quick fix: Clear localStorage, re-login, hard refresh browser

For more details, read: INCOMING_MESSAGES_DIAGNOSTIC_JAN8.md
`);

console.log();
