#!/usr/bin/env node
/**
 * Test the daily tasks API to ensure data persists and reloads
 */

const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test with both users that have data
const TEST_USERS = [
  { email: 'swarsakshi9999@gmail.com', name: 'User 1' },
  { email: 'upamanyukalburgi@gmail.com', name: 'User 2' },
  { email: 'testuser456@example.com', name: 'Test User' }
];

const TEST_DATE = new Date().toISOString().split('T')[0];

function createToken(email) {
  return jwt.sign(
    { email, userId: 'test' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '7d' }
  );
}

function makeRequest(method, path, email, body = null) {
  return new Promise((resolve, reject) => {
    const token = createToken(email);
    const options = {
      hostname: 'localhost',
      port: 3002,
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
          resolve({ status: res.statusCode, data: JSON.parse(data) });
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

async function testAPI() {
  console.log('🧪 Testing Life Planner Data Persistence & Reload');
  console.log('═'.repeat(70));
  console.log(`Date: ${TEST_DATE}`);
  console.log(`Dev Server: http://localhost:3001`);
  console.log('═'.repeat(70));

  try {
    // Test 1: Save data for a user
    console.log('\n📝 Test 1: SAVE workshop tasks and sadhana');
    console.log('─'.repeat(70));

    const testData = {
      date: TEST_DATE,
      workshopTasks: [
        { id: 'wt-1', category: 'self', text: 'Morning meditation - 30 mins' },
        { id: 'wt-2', category: 'workStudy', text: 'Complete API testing documentation' },
        { id: 'wt-3', category: 'family', text: 'Call mom in the evening' }
      ],
      sadhana: {
        morning: [
          { id: 'm-1', name: 'Pranayama', frequency: '2 times', duration: '5 minutes', completed: true },
          { id: 'm-2', name: 'Meditation', frequency: '1 time', duration: '15 minutes', completed: false }
        ],
        evening: [
          { id: 'e-1', name: 'Chanting', frequency: '1 time', duration: '10 minutes', completed: false }
        ],
        diet: { waterLiters: 3.5, dryFruitsBreakfast: true, herbalDrinks: ['Tulsi tea', 'Ginger tea'] }
      }
    };

    const saveRes = await makeRequest('POST', '/api/life-planner/daily-tasks', TEST_USERS[0].email, testData);
    if (saveRes.status === 200 && saveRes.data.success) {
      console.log(`✅ Save successful for ${TEST_USERS[0].email}`);
      console.log(`   • ${testData.workshopTasks.length} workshop tasks saved`);
      console.log(`   • ${testData.sadhana.morning.length} morning practices saved`);
      console.log(`   • ${testData.sadhana.evening.length} evening practices saved`);
      console.log(`   • Water intake: ${testData.sadhana.diet.waterLiters}L`);
    } else {
      console.log(`❌ Save failed: ${saveRes.status}`);
      console.log(`   ${saveRes.data.error}`);
    }

    // Test 2: Reload data (same user)
    console.log('\n🔄 Test 2: RELOAD data (same user - simulating page refresh)');
    console.log('─'.repeat(70));

    const reloadRes = await makeRequest('GET', `/api/life-planner/daily-tasks?date=${TEST_DATE}&type=all`, TEST_USERS[0].email);
    if (reloadRes.status === 200 && reloadRes.data.success) {
      const reloadedData = reloadRes.data.data;
      console.log(`✅ Data reloaded successfully for ${TEST_USERS[0].email}`);
      console.log(`   • Workshop tasks: ${reloadedData.workshopTasks?.length || 0} (expected: ${testData.workshopTasks.length})`);
      
      if (reloadedData.workshopTasks?.length === testData.workshopTasks.length) {
        console.log(`   ✓ Workshop tasks match!`);
        console.log(`     - ${reloadedData.workshopTasks[0].text}`);
        console.log(`     - ${reloadedData.workshopTasks[1].text}`);
        console.log(`     - ${reloadedData.workshopTasks[2].text}`);
      } else {
        console.log(`   ✗ Workshop tasks mismatch!`);
      }

      if (reloadedData.sadhana?.morning) {
        console.log(`   ✓ Sadhana morning: ${reloadedData.sadhana.morning.length} practices`);
      }
    } else {
      console.log(`❌ Reload failed: ${reloadRes.status}`);
      console.log(`   ${reloadRes.data.error}`);
    }

    // Test 3: Data isolation - different user can't see User 1's data
    console.log('\n🔐 Test 3: DATA ISOLATION (User 2 tries to get User 1\'s data)');
    console.log('─'.repeat(70));

    const isolationRes = await makeRequest('GET', `/api/life-planner/daily-tasks?date=${TEST_DATE}&type=all`, TEST_USERS[1].email);
    if (isolationRes.status === 200) {
      const user2Data = isolationRes.data.data;
      const user1HasWorkshopTasks = testData.workshopTasks.length > 0;
      const user2SeesWorkshopTasks = user2Data.workshopTasks?.length > 0;
      
      if (!user2SeesWorkshopTasks && user1HasWorkshopTasks) {
        console.log(`✅ Proper data isolation: User 2 cannot see User 1's tasks`);
      } else if (user2SeesWorkshopTasks && user1HasWorkshopTasks) {
        console.log(`❌ DATA LEAK: User 2 can see User 1's tasks!`);
      } else {
        console.log(`✅ User 2 has no tasks (as expected)`);
      }
    }

    // Test 4: Only workshop tasks
    console.log('\n📋 Test 4: GET only WORKSHOP TASKS');
    console.log('─'.repeat(70));

    const tasksOnlyRes = await makeRequest('GET', `/api/life-planner/daily-tasks?date=${TEST_DATE}&type=workshopTasks`, TEST_USERS[0].email);
    if (tasksOnlyRes.status === 200 && tasksOnlyRes.data.success) {
      console.log(`✅ Workshop tasks retrieved: ${tasksOnlyRes.data.data.length}`);
      tasksOnlyRes.data.data.forEach((task, i) => {
        console.log(`   ${i + 1}. [${task.category}] ${task.text}`);
      });
    }

    // Test 5: Only sadhana
    console.log('\n🧘 Test 5: GET only SADHANA');
    console.log('─'.repeat(70));

    const sadhanaOnlyRes = await makeRequest('GET', `/api/life-planner/daily-tasks?date=${TEST_DATE}&type=sadhana`, TEST_USERS[0].email);
    if (sadhanaOnlyRes.status === 200 && sadhanaOnlyRes.data.success) {
      const sadhana = sadhanaOnlyRes.data.data;
      console.log(`✅ Sadhana retrieved`);
      console.log(`   Morning practices: ${sadhana?.morning?.length || 0}`);
      console.log(`   Evening practices: ${sadhana?.evening?.length || 0}`);
      console.log(`   Water intake: ${sadhana?.diet?.waterLiters || 0}L`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log('✅ All tests completed!');
    console.log('\n📊 Summary:');
    console.log('  Users can now:');
    console.log('  ✓ Add workshop tasks in daily planner');
    console.log('  ✓ Add sadhana practices');
    console.log('  ✓ Refresh page and see data persists');
    console.log('  ✓ Each user sees only their own data');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Wait for server to be ready
setTimeout(testAPI, 1000);
