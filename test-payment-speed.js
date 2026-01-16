#!/usr/bin/env node

/**
 * Payment Loading Time Performance Test
 * Tests Cashfree and PayU payment initiation endpoints
 * Verifies they complete within 5 second target
 */

const http = require('http');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(color, label, message) {
  console.log(`${color}${label}${colors.reset} ${message}`);
}

async function testPaymentEndpoint(url, method = 'GET', timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const timeoutHandle = setTimeout(() => {
      log(colors.red, '❌ TIMEOUT', `Request exceeded ${timeout}ms`);
      resolve({ success: false, duration: Date.now() - startTime, error: 'Timeout' });
    }, timeout);

    const req = http.request(url, { method }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        clearTimeout(timeoutHandle);
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        const success = status >= 200 && status < 300;
        resolve({ success, duration, status, data });
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeoutHandle);
      const duration = Date.now() - startTime;
      log(colors.red, '❌ ERROR', error.message);
      resolve({ success: false, duration, error: error.message });
    });

    req.end();
  });
}

async function runTests() {
  log(colors.bright + colors.blue, '🚀 PAYMENT PERFORMANCE TEST', '');
  log(colors.bright, '📋 TEST CONFIGURATION', '');
  console.log(`   Target Load Time: 5 seconds`);
  console.log(`   Cashfree API Timeout: 3.5 seconds`);
  console.log(`   PayU API Timeout: 5 seconds`);
  console.log('');

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const token = process.env.TEST_TOKEN || 'test-token';

  const testCases = [
    {
      name: 'Cashfree Payment Initiation',
      path: '/api/payments/cashfree/initiate',
      method: 'POST',
      timeout: 5000,
      expected: '< 5s',
    },
    {
      name: 'PayU Payment Initiation',
      path: '/api/payments/payu/initiate',
      method: 'POST',
      timeout: 5000,
      expected: '< 5s',
    },
  ];

  console.log(`${colors.bright}📊 RUNNING TESTS${colors.reset}\n`);

  let passCount = 0;
  let failCount = 0;

  for (const testCase of testCases) {
    const url = `${baseUrl}${testCase.path}`;
    console.log(`${colors.blue}Testing: ${testCase.name}${colors.reset}`);
    console.log(`  URL: ${url}`);
    console.log(`  Timeout: ${testCase.timeout}ms`);

    const result = await testPaymentEndpoint(url, testCase.method, testCase.timeout);

    const duration = result.duration;
    const status = result.status || 'N/A';

    // Performance assessment
    let assessment = '';
    let assessmentColor = colors.green;

    if (result.success) {
      if (duration <= 2000) {
        assessment = '⚡ EXCELLENT';
      } else if (duration <= 3500) {
        assessment = '✅ GOOD';
      } else if (duration <= 5000) {
        assessment = '⚠️  ACCEPTABLE';
        assessmentColor = colors.yellow;
      } else {
        assessment = '❌ SLOW';
        assessmentColor = colors.red;
      }
    } else {
      assessment = '❌ FAILED';
      assessmentColor = colors.red;
    }

    console.log(`  ${assessmentColor}${assessment}${colors.reset} (${duration}ms)`);
    console.log(`  Status: ${status}`);
    console.log('');

    if (duration <= 5000 && result.success) {
      passCount++;
    } else {
      failCount++;
    }
  }

  // Summary
  console.log(`${colors.bright}📈 TEST SUMMARY${colors.reset}`);
  console.log(`  ✅ Passed: ${passCount}/${testCases.length}`);
  console.log(`  ❌ Failed: ${failCount}/${testCases.length}`);
  console.log('');

  if (failCount === 0) {
    log(colors.green, '✅ ALL TESTS PASSED', 'Payment endpoints meet 5-second target!');
  } else {
    log(colors.red, '❌ SOME TESTS FAILED', 'Review timeout configuration');
  }

  console.log('');
  log(colors.bright, '💡 RECOMMENDATIONS', '');
  console.log('  1. Run test multiple times to check consistency');
  console.log('  2. Monitor console logs for ⚠️ warnings during production');
  console.log('  3. Adjust timeouts in PAYMENT_OPTIMIZATION_5SEC.md if needed');
  console.log('  4. Check database and API latency if tests fail');
  console.log('');
}

// Run tests
runTests().catch(console.error);
