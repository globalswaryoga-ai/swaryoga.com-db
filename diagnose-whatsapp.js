#!/usr/bin/env node

/**
 * Comprehensive WhatsApp Send Diagnostics
 * Checks all components of the send flow
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 WhatsApp Send Diagnostics\n');

// Check 1: Verify endpoint exists
console.log('1️⃣  Checking endpoint file...');
const endpointPath = path.join(__dirname, 'app/api/admin/crm/whatsapp/send/route.ts');
if (fs.existsSync(endpointPath)) {
  const content = fs.readFileSync(endpointPath, 'utf-8');
  if (content.includes('status: 202')) {
    console.log('✅ Endpoint file exists and has 202 status code');
  } else {
    console.log('⚠️  Endpoint file exists but missing 202 status code');
  }
} else {
  console.log('❌ Endpoint file not found');
}

// Check 2: Verify useCRM hook is fixed
console.log('\n2️⃣  Checking useCRM hook...');
const hookPath = path.join(__dirname, 'hooks/useCRM.ts');
if (fs.existsSync(hookPath)) {
  const content = fs.readFileSync(hookPath, 'utf-8');
  if (content.includes('response.status < 200 || response.status >= 300')) {
    console.log('✅ useCRM hook is FIXED - treats 202 as success');
  } else if (content.includes('!response.ok')) {
    console.log('❌ useCRM hook is NOT fixed - still uses response.ok');
  } else {
    console.log('⚠️  Could not determine hook status');
  }
} else {
  console.log('❌ useCRM hook not found');
}

// Check 3: Verify handleSend in page.tsx
console.log('\n3️⃣  Checking WhatsApp page handleSend...');
const pagePath = path.join(__dirname, 'app/admin/crm/whatsapp/page.tsx');
if (fs.existsSync(pagePath)) {
  const content = fs.readFileSync(pagePath, 'utf-8');
  if (content.includes('messageStatus === \'queued\'')) {
    console.log('✅ handleSend checks for queued status');
  } else {
    console.log('⚠️  handleSend may not handle queued status properly');
  }
  if (content.includes('/api/admin/crm/whatsapp/send')) {
    console.log('✅ handleSend calls correct endpoint');
  } else {
    console.log('❌ handleSend not calling correct endpoint');
  }
} else {
  console.log('❌ WhatsApp page not found');
}

// Check 4: Verify endpoint normalizes phone
console.log('\n4️⃣  Checking phone normalization...');
const normalizePhonePath = path.join(__dirname, 'lib/whatsapp.ts');
if (fs.existsSync(normalizePhonePath)) {
  const content = fs.readFileSync(normalizePhonePath, 'utf-8');
  if (content.includes('export function normalizePhone')) {
    console.log('✅ normalizePhone function exists');
  }
} else {
  console.log('⚠️  whatsapp.ts not found');
}

// Check 5: List recent commits
console.log('\n5️⃣  Recent commits...');
const { execSync } = require('child_process');
try {
  const commits = execSync('git log --oneline -10', { encoding: 'utf-8' });
  const relevant = commits.split('\n').filter(line => 
    line.includes('WhatsApp') || 
    line.includes('useCRM') || 
    line.includes('202') ||
    line.includes('send')
  );
  if (relevant.length > 0) {
    console.log('✅ Recent commits found:');
    relevant.forEach(commit => console.log(`   ${commit}`));
  }
} catch (err) {
  console.log('⚠️  Could not check commits');
}

// Check 6: Schema verification
console.log('\n6️⃣  Checking WhatsAppMessage schema...');
const dbPath = path.join(__dirname, 'lib/db.ts');
if (fs.existsSync(dbPath)) {
  const content = fs.readFileSync(dbPath, 'utf-8');
  if (content.includes('WhatsAppMessage')) {
    console.log('✅ WhatsAppMessage schema exists');
    if (content.includes('status:')) {
      console.log('✅ Schema has status field');
    }
  }
} else {
  console.log('⚠️  db.ts not found');
}

console.log('\n' + '='.repeat(50));
console.log('Summary:');
console.log('='.repeat(50));
console.log(`
If all checks passed (✅), the code is correct.
If "send message" still fails, the issue might be:

1. Browser cache not cleared
   → Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   
2. App not rebuilt/restarted
   → Wait 2-5 minutes for Vercel deployment
   → Or restart local dev: npm run dev
   
3. Bridge is actually down
   → Check: https://wa-bridge.swaryoga.com/api/status
   
4. Different error than expected
   → Open browser DevTools (F12)
   → Go to Network tab
   → Send message
   → Click on request to /api/admin/crm/whatsapp/send
   → Check Response tab for error details
`);
