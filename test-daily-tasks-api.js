#!/usr/bin/env node
/**
 * Test the new daily tasks API
 */

const http = require('http');
const jwt = require('jsonwebtoken');

const TEST_USER_EMAIL = 'testuser456@example.com';
const TEST_DATE = new Date().toISOString().split('T')[0]; // Today YYYY-MM-DD

// Create a test JWT token
const token = jwt.sign(
  { email: TEST_USER_EMAIL, userId: 'test123' },
  process.env.JWT_SECRET || 'test-secret',
  { expiresIn: '7d' }
);

console.log('🧪 Testing Daily Tasks API');
console.log('━'.repeat(50));
console.log('Test User Email:', TEST_USER_EMAIL);
console.log('Test Date:', TEST_DATE);
console.log('━'.repeat(50));

// Test data
const testWorkshopTasks = [
  {
    id: 'task-1',
    category: 'self',
    text: 'Morning meditation'
  },
  {
    id: 'task-2',
    category: 'workStudy',
    text: 'Complete project documentation'
  }
];

const testSadhana = {
  morning: [
    { id: 'm-1', name: 'Pranayama', frequency: '2 times', duration: '5 minutes', completed: true }
  ],
  evening: [],
  diet: { waterLiters: 2.5, dryFruitsBreakfast: true, herbalDrinks: ['Tulsi tea'] }
};

// Helper to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  try {
    // Test 1: POST - Save tasks
    console.log('\n📝 Test 1: Saving workshop tasks and sadhana...');
    const saveResponse = await makeRequest('POST', '/api/life-planner/daily-tasks', {
      date: TEST_DATE,
      workshopTasks: testWorkshopTasks,
      sadhana: testSadhana
    });
    
    if (saveResponse.status === 200 && saveResponse.data.success) {
      console.log('✅ Save successful');
      console.log('   Status:', saveResponse.status);
      console.log('   Message:', saveResponse.data.message);
    } else {
      console.log('❌ Save failed');
      console.log('   Status:', saveResponse.status);
      console.log('   Error:', saveResponse.data.error);
    }

    // Test 2: GET - Fetch all data
    console.log('\n📖 Test 2: Fetching all daily tasks...');
    const getAllResponse = await makeRequest('GET', `/api/life-planner/daily-tasks?date=${TEST_DATE}&type=all`);
    
    if (getAllResponse.status === 200 && getAllResponse.data.success) {
      console.log('✅ Fetch successful');
      console.log('   Workshop Tasks:', getAllResponse.data.data.workshopTasks.length);
      console.log('   Sadhana Morning:', getAllResponse.data.data.sadhana?.morning?.length || 0);
    } else {
      console.log('❌ Fetch failed');
      console.log('   Status:', getAllResponse.status);
      console.log('   Error:', getAllResponse.data.error);
    }

    // Test 3: GET - Fetch only workshop tasks
    console.log('\n📖 Test 3: Fetching only workshop tasks...');
    const getTasksResponse = await makeRequest('GET', `/api/life-planner/daily-tasks?date=${TEST_DATE}&type=workshopTasks`);
    
    if (getTasksResponse.status === 200 && getTasksResponse.data.success) {
      console.log('✅ Fetch successful');
      console.log('   Tasks:', getTasksResponse.data.data);
    } else {
      console.log('❌ Fetch failed');
      console.log('   Status:', getTasksResponse.status);
    }

    // Test 4: GET - Fetch only sadhana
    console.log('\n📖 Test 4: Fetching only sadhana...');
    const getSadhanaResponse = await makeRequest('GET', `/api/life-planner/daily-tasks?date=${TEST_DATE}&type=sadhana`);
    
    if (getSadhanaResponse.status === 200 && getSadhanaResponse.data.success) {
      console.log('✅ Fetch successful');
      console.log('   Sadhana Morning Practices:', getSadhanaResponse.data.data?.morning?.length || 0);
      console.log('   Water Liters:', getSadhanaResponse.data.data?.diet?.waterLiters || 0);
    } else {
      console.log('❌ Fetch failed');
      console.log('   Status:', getSadhanaResponse.status);
    }

    console.log('\n' + '━'.repeat(50));
    console.log('✅ All tests completed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during tests:', error.message);
    process.exit(1);
  }
}

// Wait for server to be ready
setTimeout(runTests, 1000);
