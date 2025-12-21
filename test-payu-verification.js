#!/usr/bin/env node
/**
 * PayU Verification Suite
 * Verifies credentials, hash generation, and configuration
 */

const crypto = require('crypto');
require('dotenv').config();

const PAYU_MERCHANT_KEY = (process.env.PAYU_MERCHANT_KEY || '').toString().trim();
const PAYU_MERCHANT_SALT = (process.env.PAYU_MERCHANT_SALT || '').toString().trim();
const PAYU_MODE = (process.env.PAYU_MODE || 'TEST').toString().trim();

console.log('\n========================================');
console.log('🔐 PayU Configuration Verification');
console.log('========================================\n');

// 1. Check Credentials
console.log('1️⃣  CREDENTIALS STATUS:');
console.log(`   Merchant Key: ${PAYU_MERCHANT_KEY ? '✅ SET' : '❌ MISSING'} (${PAYU_MERCHANT_KEY?.substring(0, 3)}***)`);
console.log(`   Merchant Salt: ${PAYU_MERCHANT_SALT ? '✅ SET' : '❌ MISSING'} (${PAYU_MERCHANT_SALT?.substring(0, 3)}***)`);
console.log(`   Mode: ${PAYU_MODE} ${PAYU_MODE.includes('Production') || PAYU_MODE.includes('Prod') ? '🟢 PRODUCTION' : '🟡 TEST'}`);

if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
  console.log('\n❌ ERROR: Missing PayU credentials. Check .env file.');
  process.exit(1);
}

// 2. Test Hash Generation
console.log('\n2️⃣  HASH GENERATION TEST:');

const testTxnId = 'TEST' + Date.now();
const testAmount = '1000.00';
const testProduct = 'Test Product';
const testFirstName = 'Test';
const testEmail = 'test@example.com';

// PayU hash formula (for transaction initiation):
// hash = SHA512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
const hashString = `${PAYU_MERCHANT_KEY}|${testTxnId}|${testAmount}|${testProduct}|${testFirstName}|${testEmail}||||||||||${PAYU_MERCHANT_SALT}`;
const generatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

console.log(`   Transaction ID: ${testTxnId}`);
console.log(`   Hash String (first 50 chars): ${hashString.substring(0, 50)}...`);
console.log(`   Generated Hash (first 32 chars): ${generatedHash.substring(0, 32)}...`);
console.log(`   ✅ Hash generation successful`);

// 3. Verify Response Hash Function
console.log('\n3️⃣  RESPONSE HASH VERIFICATION:');

function verifyResponseHash(key, salt, txnid, amount, status) {
  const responseHashString = `${salt}|${status}|||||||||||||${key}|${txnid}|${amount}`;
  return crypto.createHash('sha512').update(responseHashString).digest('hex');
}

const responseHash = verifyResponseHash(PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT, testTxnId, testAmount, 'success');
console.log(`   Response Hash (first 32 chars): ${responseHash.substring(0, 32)}...`);
console.log(`   ✅ Response hash calculation successful`);

// 4. Check PayU URLs
console.log('\n4️⃣  PAYU URLS:');
const payuBase = PAYU_MODE.includes('Production') || PAYU_MODE.includes('Prod') 
  ? 'https://secure.payu.in'
  : 'https://test.payu.in';
console.log(`   Base URL: ${payuBase}`);
console.log(`   Payment Path: ${payuBase}/_payment`);
console.log(`   ✅ URLs configured`);

// 5. Environment Check
console.log('\n5️⃣  DATABASE CONFIGURATION:');
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  console.log(`   MongoDB: ✅ CONFIGURED (${mongoUri.substring(0, 30)}...)`);
} else {
  console.log(`   MongoDB: ⚠️  NOT CONFIGURED`);
}

console.log('\n========================================');
console.log('✅ PayU Configuration Verification Complete');
console.log('========================================\n');
