#!/usr/bin/env node

/**
 * Test bot endpoint directly with curl simulation
 */

require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const ADMIN_TOKEN = process.env.DEBUG_ADMIN_TOKEN || process.env.ADMIN_TOKEN || 'dummy-token-for-test';

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 Test Bot Endpoint Direct Call');
console.log('═══════════════════════════════════════════════════════════\n');

const testScheduleIds = [
  '69e15dec3f6f799169be189f', // From earlier debug
  'test-invalid-id', // To trigger error
];

async function testEndpoint() {
  for (const scheduleId of testScheduleIds) {
    console.log(`\nTesting with scheduleId: ${scheduleId}`);
    console.log('───────────────────────────────────────────────────────\n');

    try {
      const response = await axios.post(
        'http://localhost:3000/api/admin/crm/sadhana-scheduler/test-bot',
        { scheduleId },
        {
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      );

      console.log(`Status: ${response.status}\n`);
      
      if (response.data.logs) {
        console.log('📋 LOGS:');
        response.data.logs.forEach(log => {
          console.log(`  ${log}`);
        });
      }

      if (response.data.message) {
        console.log(`\n💬 Message: ${response.data.message}`);
      }

      console.log(`\nSuccess: ${response.data.success ? '✅ YES' : '❌ NO'}\n`);

      if (response.status === 200 && response.data.success) {
        console.log('✅ Test succeeded!');
      } else {
        console.log('❌ Test failed');
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    if (testScheduleIds.indexOf(scheduleId) < testScheduleIds.length - 1) {
      console.log('\n═══════════════════════════════════════════════════════════');
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Test complete');
}

testEndpoint();
