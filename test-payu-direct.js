/**
 * Direct PayU API Test
 * Tests the actual PayU endpoint to see what error we get
 */

const crypto = require('crypto');
const https = require('https');

const MERCHANT_KEY = 'a0qFQP';
const MERCHANT_SALT = 'LRBR0ZsXTLuXsQTY4xgHx8HgeYuKy2Jk';
const PAYU_BASE = 'https://secure.payu.in';

// Test credentials
const testData = {
  key: MERCHANT_KEY,
  txnid: 'TEST' + Date.now().toString(36),
  amount: '99.17',
  productinfo: 'Basic Swar Yoga - Hindi Online',
  firstname: 'Test',
  email: 'test@example.com',
};

// Generate hash
function generateHash(params) {
  const hashArray = [
    params.key,
    params.txnid,
    params.amount,
    params.productinfo,
    params.firstname,
    params.email,
    '', '', '', '', '', '', '', '', '',
    MERCHANT_SALT
  ];
  
  const hashString = hashArray.join('|');
  return crypto.createHash('sha512').update(hashString).digest('hex');
}

testData.hash = generateHash(testData);

console.log('🧪 PayU Direct API Test');
console.log('========================\n');
console.log('Test Data:');
console.log('- Merchant Key:', testData.key);
console.log('- Transaction ID:', testData.txnid);
console.log('- Amount:', testData.amount);
console.log('- Product Info:', testData.productinfo);
console.log('- Email:', testData.email);
console.log('- Hash:', testData.hash.substring(0, 32) + '...');
console.log('\n');

// Test 1: Verify endpoint accessibility
console.log('Test 1: Checking PayU endpoint...');
const req1 = https.get(PAYU_BASE, (res) => {
  console.log('✅ PayU endpoint is accessible (HTTP', res.statusCode, ')\n');
});

req1.on('error', (err) => {
  console.log('❌ PayU endpoint error:', err.message, '\n');
});

// Test 2: POST form data (simulating payment initiation)
setTimeout(() => {
  console.log('Test 2: Simulating payment form submission...');
  
  const formData = new URLSearchParams(testData).toString();
  
  const options = {
    hostname: 'secure.payu.in',
    port: 443,
    path: '/_payment',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(formData),
    }
  };

  const req2 = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Response Status:', res.statusCode);
      if (res.statusCode !== 200) {
        console.log('Response Headers:', res.headers);
        console.log('Response Body (first 500 chars):');
        console.log(data.substring(0, 500));
      } else {
        console.log('✅ Request accepted by PayU');
      }
    });
  });

  req2.on('error', (err) => {
    console.log('❌ Request error:', err.message);
  });

  req2.write(formData);
  req2.end();
}, 1000);

// Test 3: Check merchant key validity
setTimeout(() => {
  console.log('\nTest 3: Merchant credentials validation...');
  console.log('Key Format Valid:', /^[a-zA-Z0-9]{5,10}$/.test(MERCHANT_KEY));
  console.log('Salt Format Valid:', /^[a-zA-Z0-9]{32,}$/.test(MERCHANT_SALT));
  console.log('Hash Format Valid:', /^[a-f0-9]{128}$/.test(testData.hash));
}, 2000);

// Test 4: Common PayU issues
setTimeout(() => {
  console.log('\n⚠️  Common PayU "Too many Requests" causes:');
  console.log('1. Merchant account is throttled - contact PayU support');
  console.log('2. Merchant key is inactive or suspended');
  console.log('3. Multiple rapid requests from same account');
  console.log('4. Hash mismatch causing PayU to reject request');
  console.log('5. IP address is blacklisted by PayU');
  console.log('6. Merchant account has reached daily transaction limit');
  console.log('');
  console.log('📞 Contact PayU Support:');
  console.log('   Email: care@payu.in');
  console.log('   Phone: 1860-500-1111');
}, 3000);
