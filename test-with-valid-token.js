#!/usr/bin/env node

/**
 * Get a valid admin token and test the endpoint
 */

require('dotenv').config({ path: '.env.local' });
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const SCHEDULE_ID = '69e15dec3f6f799169be189f';

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET not set');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 Generate Valid Token & Test Endpoint');
console.log('═══════════════════════════════════════════════════════════\n');

// Create a valid token
const token = jwt.sign(
  {
    userId: 'admincrm',
    email: 'admin@swaryoga.com',
    isAdmin: true,
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('✅ Generated valid JWT token:\n');
console.log(token);
console.log('\n');

// Test command
console.log('═══════════════════════════════════════════════════════════\n');
console.log('📋 Use this curl command to test the endpoint:\n');

const curlCommand = `curl -X POST http://localhost:3000/api/admin/crm/sadhana-scheduler/test-bot \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{"scheduleId":"${SCHEDULE_ID}"}' \\
  2>&1 | jq . 2>/dev/null || curl -X POST http://localhost:3000/api/admin/crm/sadhana-scheduler/test-bot \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{"scheduleId":"${SCHEDULE_ID}"}'`;

console.log(curlCommand);
console.log('\n');

// Also try with axios
console.log('═══════════════════════════════════════════════════════════\n');
console.log('🚀 Testing endpoint with axios...\n');

const axios = require('axios');

async function testWithAxios() {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/admin/crm/sadhana-scheduler/test-bot',
      { scheduleId: SCHEDULE_ID },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        validateStatus: () => true,
      }
    );

    console.log(`Status: ${response.status}\n`);
    
    if (response.data.logs && response.data.logs.length > 0) {
      console.log('📋 EXECUTION LOGS:\n');
      response.data.logs.forEach(log => {
        console.log(`  ${log}`);
      });
      console.log();
    }

    if (response.data.message) {
      console.log(`💬 Message: ${response.data.message}\n`);
    }

    console.log(`Success: ${response.data.success ? '✅ YES' : '❌ NO'}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

testWithAxios();
