#!/usr/bin/env node

/**
 * Advanced PayU 403 Debugger
 * Provides detailed analysis of PayU authentication issues
 */

const crypto = require('crypto');
require('dotenv').config();

const PAYU_MERCHANT_KEY = (process.env.PAYU_MERCHANT_KEY || '').trim();
const PAYU_MERCHANT_SALT = (process.env.PAYU_MERCHANT_SALT || '').trim();
const PAYU_MODE = (process.env.PAYU_MODE || 'TEST').toUpperCase();

console.log('\n' + '='.repeat(70));
console.log('🔍 ADVANCED PayU 403 DEBUGGING REPORT');
console.log('='.repeat(70) + '\n');

// ===========================================================================
// SECTION 1: Credential Analysis
// ===========================================================================

console.log('📋 SECTION 1: CREDENTIAL ANALYSIS\n');

console.log('Environment Configuration:');
console.log(`  PAYU_MERCHANT_KEY: ${PAYU_MERCHANT_KEY ? '✅ SET' : '❌ MISSING'}`);
console.log(`  PAYU_MERCHANT_SALT: ${PAYU_MERCHANT_SALT ? '✅ SET' : '❌ MISSING'}`);
console.log(`  PAYU_MODE: ${PAYU_MODE} ${PAYU_MODE === 'PRODUCTION' ? '🔴 (PRODUCTION)' : '🟡 (TEST)'}\n`);

if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
  console.log('❌ ERROR: Credentials not configured!');
  process.exit(1);
}

console.log('Credential Format Analysis:');
console.log(`  Key: "${PAYU_MERCHANT_KEY}"`);
console.log(`    - Length: ${PAYU_MERCHANT_KEY.length} chars`);
console.log(`    - First 3: ${PAYU_MERCHANT_KEY.substring(0, 3)}`);
console.log(`    - Contains spaces: ${PAYU_MERCHANT_KEY.includes(' ') ? '❌ YES' : '✅ NO'}`);
console.log(`    - Format: ${/^[a-zA-Z0-9]+$/.test(PAYU_MERCHANT_KEY) ? '✅ Alphanumeric' : '⚠️ Contains special chars'}`);

console.log(`\n  Salt: "${PAYU_MERCHANT_SALT.substring(0, 10)}...${PAYU_MERCHANT_SALT.substring(PAYU_MERCHANT_SALT.length - 10)}"`);
console.log(`    - Length: ${PAYU_MERCHANT_SALT.length} chars`);
console.log(`    - Contains spaces: ${PAYU_MERCHANT_SALT.includes(' ') ? '❌ YES' : '✅ NO'}`);
console.log(`    - Format: ${/^[a-zA-Z0-9]+$/.test(PAYU_MERCHANT_SALT) ? '✅ Alphanumeric' : '⚠️ Contains special chars'}`);

// ===========================================================================
// SECTION 2: Hash Calculation Deep Dive
// ===========================================================================

console.log('\n\n📊 SECTION 2: HASH CALCULATION DEEP DIVE\n');

const testTransactionData = {
  key: PAYU_MERCHANT_KEY,
  txnid: 'TEST1234567890ABCDEF',
  amount: '100.00',
  productinfo: 'Test Product',
  firstname: 'Test User',
  email: 'test@example.com',
  phone: '919876543210',
  address1: 'Test Address',
  city: 'Test City',
  state: 'Test State',
  zipcode: '000000',
  udf1: '',
  udf2: '',
  udf3: '',
  udf4: '',
  udf5: '',
};

console.log('Test Transaction Data:');
Object.entries(testTransactionData).forEach(([key, value]) => {
  if (key === 'key') {
    console.log(`  ${key}: ${value.substring(0, 3)}***`);
  } else if (key === 'email') {
    console.log(`  ${key}: ${value.substring(0, 5)}***@${value.split('@')[1]}`);
  } else {
    console.log(`  ${key}: "${value}"`);
  }
});

// Build hash string according to PayU formula
const hashComponents = [
  testTransactionData.key,
  testTransactionData.txnid,
  testTransactionData.amount,
  testTransactionData.productinfo,
  testTransactionData.firstname,
  testTransactionData.email,
  testTransactionData.udf1 || '',
  testTransactionData.udf2 || '',
  testTransactionData.udf3 || '',
  testTransactionData.udf4 || '',
  testTransactionData.udf5 || '',
  '', // udf6
  '', // udf7
  '', // udf8
  '', // udf9
  '', // udf10
  PAYU_MERCHANT_SALT,
];

const hashString = hashComponents.join('|');

console.log('\n\nHash String Construction:');
console.log(`  Total components: ${hashComponents.length}`);
console.log(`  Hash string length: ${hashString.length} chars`);
console.log('\n  Component breakdown:');
hashComponents.forEach((comp, idx) => {
  if (comp === '') {
    console.log(`    [${idx.toString().padStart(2, '0')}] (empty)`);
  } else if (comp.length > 30) {
    console.log(`    [${idx.toString().padStart(2, '0')}] ${comp.substring(0, 20)}...${comp.substring(comp.length - 5)}`);
  } else {
    console.log(`    [${idx.toString().padStart(2, '0')}] ${comp}`);
  }
});

console.log(`\n  Full hash string (first 100 chars):\n  ${hashString.substring(0, 100)}...`);
console.log(`\n  Full hash string (last 100 chars):\n  ...${hashString.substring(hashString.length - 100)}`);

// Generate SHA512
const sha512Hash = crypto.createHash('sha512').update(hashString).digest('hex');

console.log('\n\nSHA512 Hash Generation:');
console.log(`  Algorithm: SHA512`);
console.log(`  Hash: ${sha512Hash}`);
console.log(`  Length: ${sha512Hash.length} chars (should be 128)`);
console.log(`  Format check: ${sha512Hash.length === 128 ? '✅ CORRECT' : '❌ WRONG'}`);

// ===========================================================================
// SECTION 3: PayU Endpoint Check
// ===========================================================================

console.log('\n\n🌐 SECTION 3: PayU ENDPOINT CONFIGURATION\n');

const baseUrl = PAYU_MODE === 'PRODUCTION' 
  ? 'https://secure.payu.in'
  : 'https://test.payu.in';

console.log(`PayU Mode: ${PAYU_MODE}`);
console.log(`Base URL: ${baseUrl}`);
console.log(`Payment Endpoint: ${baseUrl}/_xclick`);
console.log(`\nFull Request URL:\n  ${baseUrl}/_xclick`);

// ===========================================================================
// SECTION 4: Common Issues Checklist
// ===========================================================================

console.log('\n\n✓ SECTION 4: ISSUE CHECKLIST\n');

const issues = [];

if (PAYU_MERCHANT_KEY.length < 5) {
  issues.push({
    severity: '🔴 CRITICAL',
    issue: 'Merchant Key too short',
    detail: `Length: ${PAYU_MERCHANT_KEY.length} (expected ≥6)`
  });
}

if (PAYU_MERCHANT_SALT.length < 20) {
  issues.push({
    severity: '🔴 CRITICAL',
    issue: 'Merchant Salt too short',
    detail: `Length: ${PAYU_MERCHANT_SALT.length} (expected ≥30)`
  });
}

if (PAYU_MERCHANT_KEY.includes(' ') || PAYU_MERCHANT_SALT.includes(' ')) {
  issues.push({
    severity: '🔴 CRITICAL',
    issue: 'Credentials contain spaces',
    detail: 'This will definitely cause 403 errors'
  });
}

if (!/^[a-zA-Z0-9]+$/.test(PAYU_MERCHANT_KEY) || !/^[a-zA-Z0-9]+$/.test(PAYU_MERCHANT_SALT)) {
  issues.push({
    severity: '⚠️  WARNING',
    issue: 'Credentials contain special characters',
    detail: 'Verify this matches PayU dashboard exactly'
  });
}

if (!PAYU_MODE.includes('PRODUCTION') && !PAYU_MODE.includes('TEST')) {
  issues.push({
    severity: '⚠️  WARNING',
    issue: 'PAYU_MODE is unusual',
    detail: `Value: ${PAYU_MODE} (should be TEST or PRODUCTION)`
  });
}

if (issues.length === 0) {
  console.log('✅ No obvious credential issues detected\n');
  console.log('If still getting 403 errors, check:');
  console.log('  1. Are these credentials from YOUR PayU account?');
  console.log('  2. Is your PayU account active and approved?');
  console.log('  3. Are there any IP whitelist restrictions?');
  console.log('  4. Has the Merchant Key been regenerated recently?');
} else {
  issues.forEach(({ severity, issue, detail }) => {
    console.log(`${severity} ${issue}`);
    console.log(`         ${detail}`);
    console.log();
  });
}

// ===========================================================================
// SECTION 5: Quick Test
// ===========================================================================

console.log('\n\n🧪 SECTION 5: CURL TEST COMMAND\n');

console.log('You can test PayU directly with this curl command:\n');

const curlCommand = `curl -X POST ${baseUrl}/_xclick \\
  -d "key=${PAYU_MERCHANT_KEY}" \\
  -d "txnid=${testTransactionData.txnid}" \\
  -d "amount=${testTransactionData.amount}" \\
  -d "productinfo=${testTransactionData.productinfo}" \\
  -d "firstname=${testTransactionData.firstname}" \\
  -d "email=${testTransactionData.email}" \\
  -d "phone=${testTransactionData.phone}" \\
  -d "address1=${testTransactionData.address1}" \\
  -d "city=${testTransactionData.city}" \\
  -d "state=${testTransactionData.state}" \\
  -d "zipcode=${testTransactionData.zipcode}" \\
  -d "surl=http://localhost:3000/payment-successful" \\
  -d "furl=http://localhost:3000/payment-failed" \\
  -d "hash=${sha512Hash}" \\
  -d "service_provider=payu_paisa" \\
  -v`;

console.log(curlCommand);

console.log('\n\nIf you get 403, the response will show:\n');
console.log('  < HTTP/1.1 403 Forbidden');
console.log('  < Date: ...');
console.log('  < Server: ...');
console.log('  Status code 403 means PayU rejected authentication\n');

// ===========================================================================
// SECTION 6: Troubleshooting Flow
// ===========================================================================

console.log('\n\n🔧 SECTION 6: TROUBLESHOOTING FLOW\n');

console.log(`STEP 1: Verify Credentials Match Your PayU Dashboard
  ❓ Login to your PayU account
  ❓ Go to Settings → API Keys or Integration
  ❓ Copy Merchant Key: ${PAYU_MERCHANT_KEY.substring(0, 3)}***
  ❓ Copy Merchant Salt: ${PAYU_MERCHANT_SALT.substring(0, 3)}***
  ❓ Do they match EXACTLY?
  
STEP 2: Check Account Status
  ❓ Is your PayU account ACTIVE?
  ❓ Is it APPROVED for payments?
  ❓ Are there any RESTRICTIONS in place?
  
STEP 3: Test with PayU Sandbox (if available)
  ❓ Switch PAYU_MODE to TEST
  ❓ Use TEST credentials from PayU sandbox
  ❓ Try a transaction
  ❓ If it works, issue is with PRODUCTION credentials
  
STEP 4: Contact PayU Support
  ❓ Email: care@payu.in
  ❓ Provide: Merchant Key (first 3 chars + last 3 chars)
  ❓ Error: 403 Forbidden
  ❓ Timestamp: $(date)
  
STEP 5: Verify Hash (Last Resort)
  ❓ Your hash: ${sha512Hash.substring(0, 20)}...
  ❓ Recalculate: SHA512 of pipe-delimited string
  ❓ Compare byte-by-byte with what PayU expects\n`);

// ===========================================================================
// SECTION 7: Alternative Solutions
// ===========================================================================

console.log('💡 ALTERNATIVE SOLUTIONS FOR 403 ERROR\n');

console.log(`Option 1: Disable PayU Temporarily
  - Redirect users to manual payment page
  - Show QR code or bank transfer details
  - Re-enable PayU after fixing credentials\n`);

console.log(`Option 2: Use Different Payment Gateway
  - Stripe (if available in India)
  - Razorpay (popular in India)
  - PhonePe / GooglePay (UPI)\n`);

console.log(`Option 3: Try PayU's New API
  - Check if PayU has updated their API
  - They may have deprecated old endpoints
  - Request updated integration guide\n`);

// ===========================================================================
// Summary
// ===========================================================================

console.log('='.repeat(70));
console.log(`✅ DEBUG REPORT COMPLETE`);
console.log(`Generated: ${new Date().toISOString()}`);
console.log(`Mode: ${PAYU_MODE}`);
console.log(`Issues Found: ${issues.length}`);
console.log('='.repeat(70) + '\n');

module.exports = {
  PAYU_MERCHANT_KEY,
  PAYU_MERCHANT_SALT,
  PAYU_MODE,
  testHash: sha512Hash,
  hashString,
  issues
};
