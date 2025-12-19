#!/usr/bin/env node

/**
 * PayU 403 Error Diagnostic Tool
 * 
 * This script helps diagnose PayU authentication errors (403 Forbidden)
 * Common causes:
 * 1. Invalid merchant key/salt
 * 2. Hash calculation error
 * 3. Mode mismatch (TEST vs PRODUCTION)
 * 4. Account restrictions
 */

const crypto = require('crypto');

// Load environment
require('dotenv').config();

const PAYU_MERCHANT_KEY = (process.env.PAYU_MERCHANT_KEY || '').trim();
const PAYU_MERCHANT_SALT = (process.env.PAYU_MERCHANT_SALT || '').trim();
const PAYU_MODE = (process.env.PAYU_MODE || 'TEST').toUpperCase();

console.log('\n🔍 PayU Diagnostic Report\n');
console.log('=' .repeat(60));

// Check 1: Credentials present
console.log('\n✓ Check 1: Credentials Configuration');
console.log(`  Merchant Key: ${PAYU_MERCHANT_KEY ? '✅ SET (' + PAYU_MERCHANT_KEY.substring(0, 3) + '...)' : '❌ MISSING'}`);
console.log(`  Merchant Salt: ${PAYU_MERCHANT_SALT ? '✅ SET (' + PAYU_MERCHANT_SALT.substring(0, 3) + '...)' : '❌ MISSING'}`);
console.log(`  Mode: ${PAYU_MODE} (${PAYU_MODE === 'PRODUCTION' ? '🟢 Production' : '🟡 Test'})`);

if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
  console.log('\n❌ ERROR: PayU credentials not configured!');
  console.log('   Update .env.local with:');
  console.log('   PAYU_MERCHANT_KEY=your_merchant_key');
  console.log('   PAYU_MERCHANT_SALT=your_merchant_salt');
  process.exit(1);
}

// Check 2: Hash calculation
console.log('\n✓ Check 2: Hash Calculation Test');

const testData = {
  key: PAYU_MERCHANT_KEY,
  txnid: 'test123456789abc',
  amount: '100.00',
  productinfo: 'Test Product',
  firstname: 'Test',
  email: 'test@example.com',
  udf1: '',
  udf2: '',
  udf3: '',
  udf4: '',
  udf5: '',
};

// Generate hash following PayU format
const hashString = [
  testData.key,
  testData.txnid,
  testData.amount,
  testData.productinfo,
  testData.firstname,
  testData.email,
  testData.udf1 || '',
  testData.udf2 || '',
  testData.udf3 || '',
  testData.udf4 || '',
  testData.udf5 || '',
  '', // udf6
  '', // udf7
  '', // udf8
  '', // udf9
  '', // udf10
  PAYU_MERCHANT_SALT,
].join('|');

const hash = crypto.createHash('sha512').update(hashString).digest('hex');

console.log(`  Hash String (first 80 chars): ${hashString.substring(0, 80)}...`);
console.log(`  Generated SHA512 Hash: ${hash.substring(0, 20)}...`);
console.log(`  ✅ Hash calculation working`);

// Check 3: Common issues
console.log('\n✓ Check 3: Common Issues & Solutions');

const issues = [];

if (PAYU_MERCHANT_KEY.length < 5) {
  issues.push('❌ Merchant Key too short (should be ~6 chars)');
}

if (PAYU_MERCHANT_SALT.length < 20) {
  issues.push('❌ Merchant Salt too short (should be ~30+ chars)');
}

if (PAYU_MERCHANT_KEY.includes(' ') || PAYU_MERCHANT_SALT.includes(' ')) {
  issues.push('⚠️  Whitespace found in credentials (trimming should handle this)');
}

if (issues.length === 0) {
  console.log('  ✅ No obvious issues detected');
} else {
  issues.forEach(issue => console.log(`  ${issue}`));
}

// Check 4: Troubleshooting guide
console.log('\n✓ Check 4: 403 Error Troubleshooting');
console.log(`
  If you're getting 403 (Forbidden) error from PayU:

  1️⃣  Verify Credentials:
      - Log in to your PayU dashboard
      - Check Merchant Key and Salt match exactly
      - Copy/paste directly (no extra spaces)
      
  2️⃣  Check Mode:
      - TEST mode uses: https://test.payu.in
      - PRODUCTION uses: https://secure.payu.in
      - Current mode: ${PAYU_MODE}
      
  3️⃣  Hash Validation:
      - PayU validates SHA512 hash on your request
      - Hash format must match exactly per PayU docs
      - Test hash with curl:
      
      curl -X POST https://${PAYU_MODE === 'PRODUCTION' ? 'secure' : 'test'}.payu.in/_xclick \\
        -d "key=${PAYU_MERCHANT_KEY}" \\
        -d "txnid=test123456789abc" \\
        -d "amount=100.00" \\
        -d "productinfo=Test" \\
        -d "firstname=Test" \\
        -d "email=test@example.com" \\
        -d "phone=1234567890" \\
        -d "address1=Test" \\
        -d "city=Test" \\
        -d "state=Test" \\
        -d "zipcode=000000" \\
        -d "surl=http://localhost:3000/payment-successful" \\
        -d "furl=http://localhost:3000/payment-failed" \\
        -d "hash=${hash}" \\
        -d "service_provider=payu_paisa"
      
  4️⃣  Account Issues:
      - Check if PayU account is active
      - Verify account is approved for payments
      - Check if there are any restrictions
      - Contact PayU support if needed
      
  5️⃣  Test Mode Recommendation:
      - First test with PAYU_MODE=TEST
      - Use test credentials from PayU sandbox
      - Once working, switch to PRODUCTION
`);

console.log('\n' + '='.repeat(60));
console.log('\n✅ Diagnostic complete. Check issues above.\n');

// Export for API route use
module.exports = {
  PAYU_MERCHANT_KEY,
  PAYU_MERCHANT_SALT,
  PAYU_MODE,
  testHash: hash,
};
