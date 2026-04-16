#!/usr/bin/env node

/**
 * Test script to auto-close Zoom meeting after video finishes
 * Usage: node test-auto-close.js <meetingId>
 * Example: node test-auto-close.js 848517136
 */

const https = require('https');

const meetingId = process.argv[2];

if (!meetingId) {
  console.error('❌ Usage: node test-auto-close.js <meetingId>');
  console.error('Example: node test-auto-close.js 848517136');
  process.exit(1);
}

console.log(`📞 Closing Zoom meeting: ${meetingId}`);
console.log(`⏱️  Time: ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

const options = {
  hostname: 'crm.swaryoga.com',
  path: `/api/admin/crm/sadhana-scheduler/auto-close?meetingId=${meetingId}`,
  method: 'GET',
  headers: {
    'User-Agent': 'Test-Script/1.0',
  },
};

https.get(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.success) {
        console.log(`✅ Meeting closed successfully!`);
        console.log(`   Meeting ID: ${response.meetingId}`);
        console.log(`   Status: ${response.message}`);
      } else {
        console.error(`❌ Error: ${response.error}`);
      }
    } catch (e) {
      console.error('❌ Response parse error:', data);
    }
  });
}).on('error', (err) => {
  console.error('❌ Request error:', err.message);
  process.exit(1);
});

// For local testing
console.log('\n📝 Manual trigger via curl:');
console.log(`curl -X GET "https://crm.swaryoga.com/api/admin/crm/sadhana-scheduler/auto-close?meetingId=${meetingId}"`);
console.log('\n📝 Or via POST:');
console.log(`curl -X POST "https://crm.swaryoga.com/api/admin/crm/sadhana-scheduler/auto-close" \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -d '{"meetingId":"${meetingId}"}'`);
