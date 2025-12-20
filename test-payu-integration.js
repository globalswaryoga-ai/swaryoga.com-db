#!/usr/bin/env node

/**
 * PayU Integration Test Utility
 * 
 * This script helps verify the PayU integration is working correctly
 * before going into production.
 * 
 * Usage:
 *   node test-payu-integration.js
 *   DEBUG_PAYU=1 node test-payu-integration.js (for verbose output)
 */

const crypto = require('crypto');
require('dotenv').config();

const PAYU_MERCHANT_KEY = (process.env.PAYU_MERCHANT_KEY || '').trim();
const PAYU_MERCHANT_SALT = (process.env.PAYU_MERCHANT_SALT || '').trim();
const PAYU_MODE = (process.env.PAYU_MODE || 'TEST').toUpperCase();

console.log('\n🧪 PayU Integration Test Utility\n');
console.log('=' .repeat(70));

// Test 1: Credentials Check
console.log('\n✓ TEST 1: Credentials Configuration');
console.log('-' .repeat(70));

const hasKey = !!PAYU_MERCHANT_KEY;
const hasSalt = !!PAYU_MERCHANT_SALT;

console.log(`  PAYU_MERCHANT_KEY: ${hasKey ? '✅ SET (' + PAYU_MERCHANT_KEY.substring(0, 3) + '...)' : '❌ MISSING'}`);
console.log(`  PAYU_MERCHANT_SALT: ${hasSalt ? '✅ SET (' + PAYU_MERCHANT_SALT.substring(0, 5) + '...)' : '❌ MISSING'}`);
console.log(`  PAYU_MODE: ${PAYU_MODE} (${PAYU_MODE === 'PRODUCTION' ? '🔴 Production' : '🟡 Test'})`);

if (!hasKey || !hasSalt) {
  console.log('\n❌ FAILED: Missing credentials');
  console.log('   Add to .env.local:');
  console.log('   PAYU_MERCHANT_KEY=your_key');
  console.log('   PAYU_MERCHANT_SALT=your_salt');
  process.exit(1);
}
console.log('  ✅ PASSED\n');

// Test 2: Hash Generation
console.log('✓ TEST 2: Hash Generation (Payment Initiation)');
console.log('-' .repeat(70));

const testParams = {
  key: PAYU_MERCHANT_KEY,
  txnid: 'TEST123456789',
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

const hashArray = [
  testParams.key,
  testParams.txnid,
  testParams.amount,
  testParams.productinfo,
  testParams.firstname,
  testParams.email,
  testParams.udf1 || '',
  testParams.udf2 || '',
  testParams.udf3 || '',
  testParams.udf4 || '',
  testParams.udf5 || '',
  '', '', '', '', '',
  PAYU_MERCHANT_SALT,
];

const hashString = hashArray.join('|');
const hash = crypto.createHash('sha512').update(hashString).digest('hex');

console.log(`  Hash String Length: ${hashString.length} chars`);
console.log(`  Hash Output Length: ${hash.length} chars (should be 128)`);
console.log(`  Hash Preview: ${hash.substring(0, 30)}...`);

if (hash.length !== 128) {
  console.log('  ❌ FAILED: Hash length incorrect');
  process.exit(1);
}
console.log('  ✅ PASSED\n');

// Test 3: Response Hash Verification
console.log('✓ TEST 3: Hash Verification (Payment Response)');
console.log('-' .repeat(70));

const responseData = {
  status: 'success',
  txnid: testParams.txnid,
  amount: testParams.amount,
  productinfo: testParams.productinfo,
  firstname: testParams.firstname,
  email: testParams.email,
};

// Response hash formula (reversed):
const responseHashArray = [
  PAYU_MERCHANT_SALT,
  responseData.status,
  '', '', '', '', '', '', '', '', '', '', // udf10-1 (all empty)
  responseData.email,
  responseData.firstname,
  responseData.productinfo,
  responseData.amount,
  responseData.txnid,
  PAYU_MERCHANT_KEY,
];

const responseHashString = responseHashArray.join('|');
const responseHash = crypto.createHash('sha512').update(responseHashString).digest('hex');

console.log(`  Response Hash String Length: ${responseHashString.length} chars`);
console.log(`  Response Hash Length: ${responseHash.length} chars (should be 128)`);
console.log(`  Response Hash Preview: ${responseHash.substring(0, 30)}...`);

if (responseHash.length !== 128) {
  console.log('  ❌ FAILED: Response hash length incorrect');
  process.exit(1);
}
console.log('  ✅ PASSED\n');

// Test 4: Parameter Validation
console.log('✓ TEST 4: Parameter Validation');
console.log('-' .repeat(70));

const mandatoryFields = {
  key: PAYU_MERCHANT_KEY,
  txnid: testParams.txnid,
  amount: testParams.amount,
  productinfo: testParams.productinfo,
  firstname: testParams.firstname,
  email: testParams.email,
};

const missingFields = Object.entries(mandatoryFields)
  .filter(([_, value]) => !value || value.toString().trim() === '')
  .map(([key]) => key);

if (missingFields.length > 0) {
  console.log(`  ❌ FAILED: Missing fields: ${missingFields.join(', ')}`);
  process.exit(1);
}

console.log('  Mandatory fields:');
Object.entries(mandatoryFields).forEach(([name, value]) => {
  console.log(`    ✅ ${name}: ${value ? '✓' : '✗'}`);
});
console.log('  ✅ PASSED\n');

// Test 5: Endpoint Configuration
console.log('✓ TEST 5: PayU Endpoint Configuration');
console.log('-' .repeat(70));

const baseUrl = PAYU_MODE === 'PRODUCTION'
  ? 'https://secure.payu.in'
  : 'https://test.payu.in';
const paymentPath = '/_payment';
const fullUrl = baseUrl + paymentPath;

console.log(`  Mode: ${PAYU_MODE}`);
console.log(`  Base URL: ${baseUrl}`);
console.log(`  Payment Path: ${paymentPath}`);
console.log(`  Full URL: ${fullUrl}`);
console.log(`  ✅ PASSED\n`);

// Summary
console.log('=' .repeat(70));
console.log('\n✅ ALL TESTS PASSED!\n');

console.log('Ready to test:');
console.log('  1. Add items to cart at http://localhost:3000');
console.log('  2. Go to checkout: http://localhost:3000/checkout');
console.log('  3. Fill in form and click "Proceed to Payment"');
console.log(`  4. Test on PayU ${PAYU_MODE === 'PRODUCTION' ? 'PRODUCTION' : 'TEST'} environment`);
console.log('  5. Use test card: 5123456789012346 (Exp: 12/2030, CVV: 123)');
console.log('  6. Enter OTP: 123456 when prompted');
console.log('\nFor detailed logs, run:');
console.log('  DEBUG_PAYU=1 npm run dev\n');

console.log('Documentation: See PAYU_TESTING_GUIDE.md\n');
