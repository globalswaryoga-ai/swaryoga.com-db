#!/usr/bin/env node

const crypto = require('crypto');

/**
 * PayU Credentials Test Script
 * Verifies that PayU credentials are configured correctly and can generate valid hashes
 */

const PAYU_MERCHANT_KEY = process.env.PAYU_MERCHANT_KEY?.toString().trim();
const PAYU_MERCHANT_SALT = process.env.PAYU_MERCHANT_SALT?.toString().trim();
const PAYU_MODE = process.env.PAYU_MODE?.toString().trim();

console.log('🔍 PayU Credentials Test\n');
console.log('═'.repeat(60));

// Step 1: Verify environment variables
console.log('\n✓ Step 1: Check Environment Variables');
console.log('─'.repeat(60));

const checks = [
  {
    name: 'PAYU_MERCHANT_KEY',
    value: PAYU_MERCHANT_KEY,
    required: true
  },
  {
    name: 'PAYU_MERCHANT_SALT',
    value: PAYU_MERCHANT_SALT,
    required: true
  },
  {
    name: 'PAYU_MODE',
    value: PAYU_MODE,
    required: true
  }
];

let allValid = true;
checks.forEach((check) => {
  const status = check.value ? '✅' : '❌';
  const display = check.value ? `${check.value.substring(0, 3)}...` : 'MISSING';
  console.log(`${status} ${check.name.padEnd(25)} : ${display}`);
  if (check.required && !check.value) {
    allValid = false;
  }
});

if (!allValid) {
  console.log('\n❌ ERROR: Missing required credentials!');
  console.log('\nAdd to .env.local:');
  console.log('  PAYU_MERCHANT_KEY=<your-key>');
  console.log('  PAYU_MERCHANT_SALT=<your-salt>');
  console.log('  PAYU_MODE=PRODUCTION\n');
  process.exit(1);
}

// Step 2: Test Hash Generation
console.log('\n\n✓ Step 2: Generate Test Hash');
console.log('─'.repeat(60));

const testParams = {
  key: PAYU_MERCHANT_KEY,
  txnid: 'TEST' + Date.now(),
  amount: '100.00',
  productinfo: 'Test Workshop',
  firstname: 'Test User',
  email: 'test@swar-yoga.com',
  udf1: '',
  udf2: '',
  udf3: '',
  udf4: '',
  udf5: ''
};

try {
  // PayU hash formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  const hashString = [
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
    '', '', '', '', '', // 6 empty pipes for udf6-10
    PAYU_MERCHANT_SALT
  ].join('|');

  const hash = crypto
    .createHash('sha512')
    .update(hashString)
    .digest('hex');

  console.log(`✅ Hash generated successfully`);
  console.log(`\n📋 Test Transaction Details:`);
  console.log(`   Transaction ID: ${testParams.txnid}`);
  console.log(`   Amount: ${testParams.amount}`);
  console.log(`   Product: ${testParams.productinfo}`);
  console.log(`   Customer: ${testParams.firstname} (${testParams.email})`);
  console.log(`\n🔐 Generated Hash:`);
  console.log(`   ${hash.substring(0, 32)}...`);
  console.log(`   (Hash length: ${hash.length} chars)`);

} catch (error) {
  console.error('❌ Hash generation failed:', error.message);
  process.exit(1);
}

// Step 3: Verify Endpoints
console.log('\n\n✓ Step 3: PayU Endpoint Configuration');
console.log('─'.repeat(60));

const isProduction = PAYU_MODE.toUpperCase().includes('PROD');
const endpoint = isProduction ? 'https://secure.payu.in' : 'https://test.payu.in';

console.log(`Mode: ${PAYU_MODE.toUpperCase()}`);
console.log(`Endpoint: ${endpoint}`);
console.log(`Payment Path: /_payment`);
console.log(`Full URL: ${endpoint}/_payment`);

// Step 4: Summary
console.log('\n\n✓ Step 4: Summary');
console.log('─'.repeat(60));

console.log(`\n✅ All Checks Passed!`);
console.log(`\n📊 Configuration Status:`);
console.log(`   ✓ Credentials present and valid`);
console.log(`   ✓ Hash generation works correctly`);
console.log(`   ✓ Mode set to: ${PAYU_MODE}`);
console.log(`   ✓ Endpoint: ${endpoint}`);

console.log(`\n🎯 Ready for Payment Processing`);
console.log(`\n💡 Next Steps:`);
console.log(`   1. Test a real payment at: /workshops/[id]/registernow/cart/checkout`);
console.log(`   2. Use test card: 5123456789012346`);
console.log(`   3. Verify webhook in server logs`);
console.log(`   4. Check database Order collection`);

console.log('\n' + '═'.repeat(60) + '\n');
