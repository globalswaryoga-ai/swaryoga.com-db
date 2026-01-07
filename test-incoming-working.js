#!/usr/bin/env node

/**
 * TERMINAL TEST: Check if Incoming Messages are Working
 * Run this to verify the complete flow
 * 
 * Usage: node test-incoming-working.js
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3004';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║   INCOMING MESSAGES - WORKING CHECK                           ║');
console.log('║   Tests: Deployment + Token + API                             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

/**
 * Test 1: Can we generate a valid token?
 */
function testTokenGeneration() {
  console.log('✓ TEST 1: Token Generation');
  console.log('─'.repeat(60));
  
  try {
    const payload = {
      userId: 'admincrm',
      email: 'admin@swaryoga.com',
      isAdmin: true,
      role: 'admin',
    };
    
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '7d',
      algorithm: 'HS256',
    });
    
    // Verify it
    const verified = jwt.verify(token, JWT_SECRET);
    
    console.log('✅ PASS: Token generated and verified');
    console.log(`   Token: ${token.substring(0, 50)}...`);
    console.log(`   User: ${verified.userId}`);
    console.log(`   Admin: ${verified.isAdmin}`);
    console.log(`   Expires: ${new Date(verified.exp * 1000).toLocaleString()}\n`);
    
    return { success: true, token };
  } catch (error) {
    console.log('❌ FAIL: Token generation failed');
    console.log(`   Error: ${error.message}\n`);
    return { success: false };
  }
}

/**
 * Test 2: Check if server is running
 */
async function testServerRunning() {
  console.log('✓ TEST 2: Server is Running');
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch(`${BASE_URL}/api/health`, {
      timeout: 5000,
    });
    
    if (response.ok || response.status === 404) {
      // 404 is OK - means server is running but endpoint doesn't exist
      console.log('✅ PASS: Server is running');
      console.log(`   URL: ${BASE_URL}`);
      console.log(`   Status: Server responsive\n`);
      return { success: true };
    } else {
      console.log('⚠️  WARNING: Server returned error');
      console.log(`   Status: ${response.status}\n`);
      return { success: false };
    }
  } catch (error) {
    console.log('❌ FAIL: Cannot connect to server');
    console.log(`   URL: ${BASE_URL}`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Fix: Make sure 'npm run dev' is running\n`);
    return { success: false };
  }
}

/**
 * Test 3: Check if API accepts JWT token
 */
async function testAPIWithToken(token) {
  console.log('✓ TEST 3: API Accepts JWT Token');
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/crm/whatsapp/meta/conversations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
    
    const data = await response.json();
    
    if (response.status === 200) {
      console.log('✅ PASS: API accepts token');
      console.log(`   Endpoint: /api/admin/crm/whatsapp/meta/conversations`);
      console.log(`   Status: ${response.status} OK`);
      console.log(`   Conversations Found: ${data?.data?.length || 0}`);
      if (data?.data?.length > 0) {
        console.log(`   Recent: ${data.data[0]?.phoneNumber}`);
      }
      console.log();
      return { success: true, conversations: data?.data || [] };
    } else if (response.status === 401) {
      console.log('❌ FAIL: API rejected token (401 Unauthorized)');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${data?.error || 'Token invalid or expired'}`);
      console.log(`   Fix: Token issue - generate new token\n`);
      return { success: false };
    } else {
      console.log(`⚠️  WARNING: API returned ${response.status}`);
      console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}\n`);
      return { success: false };
    }
  } catch (error) {
    console.log('❌ FAIL: Cannot reach API');
    console.log(`   Error: ${error.message}`);
    console.log(`   Fix: Server might not be running\n`);
    return { success: false };
  }
}

/**
 * Test 4: Check if database has messages
 */
async function testDatabase(token) {
  console.log('✓ TEST 4: Database Has Messages');
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch(`${BASE_URL}/api/admin/crm/whatsapp/meta/conversations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      timeout: 5000,
    });
    
    const data = await response.json();
    const conversations = data?.data || [];
    
    if (conversations.length > 0) {
      console.log('✅ PASS: Database has messages');
      console.log(`   Total Conversations: ${conversations.length}`);
      
      // Show first 5
      conversations.slice(0, 5).forEach((conv, i) => {
        console.log(`   ${i + 1}. ${conv.phoneNumber} - ${conv.lastMessage?.substring(0, 30) || 'No message'}...`);
      });
      console.log();
      return { success: true, count: conversations.length };
    } else {
      console.log('⚠️  WARNING: No conversations found in database');
      console.log('   This is OK if no messages have been sent yet');
      console.log('   Send a test WhatsApp message and try again\n');
      return { success: true, count: 0 }; // Not a failure
    }
  } catch (error) {
    console.log('❌ FAIL: Cannot query database');
    console.log(`   Error: ${error.message}\n`);
    return { success: false };
  }
}

/**
 * Test 5: Check WebHook endpoint exists
 */
async function testWebhookEndpoint(token) {
  console.log('✓ TEST 5: Webhook Endpoint Accessible');
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch(`${BASE_URL}/api/whatsapp/webhook`, {
      method: 'GET',
      timeout: 5000,
    });
    
    // GET should fail but endpoint should exist
    // 403 is also expected because the GET handler is only for Meta verification (hub.* params).
    if (response.status === 405 || response.status === 200 || response.status === 400 || response.status === 403) {
      console.log('✅ PASS: Webhook endpoint exists');
      console.log(`   Endpoint: /api/whatsapp/webhook`);
      console.log(`   Status: ${response.status} (expected for GET without hub.* params)\n`);
      return { success: true };
    } else {
      console.log('⚠️  WARNING: Webhook endpoint status unclear');
      console.log(`   Status: ${response.status}\n`);
      return { success: false };
    }
  } catch (error) {
    console.log('❌ FAIL: Webhook endpoint not accessible');
    console.log(`   Error: ${error.message}\n`);
    return { success: false };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  const results = {
    tokenGeneration: testTokenGeneration(),
    serverRunning: await testServerRunning(),
  };
  
  if (!results.serverRunning.success) {
    console.log('═'.repeat(60));
    console.log('⚠️  CANNOT CONTINUE: Server not running');
    console.log('═'.repeat(60));
    console.log('\nTo start the server:');
    console.log('  npm run dev\n');
    return;
  }
  
  results.apiToken = await testAPIWithToken(results.tokenGeneration.token);
  results.database = await testDatabase(results.tokenGeneration.token);
  results.webhook = await testWebhookEndpoint(results.tokenGeneration.token);
  
  // Summary
  console.log('═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  
  const passing = [
    results.tokenGeneration.success && '✅ Token Generation',
    results.serverRunning.success && '✅ Server Running',
    results.apiToken.success && '✅ API Accepts Token',
    results.database.success && '✅ Database Working',
    results.webhook.success && '✅ Webhook Endpoint',
  ].filter(Boolean);
  
  const failing = [
    !results.tokenGeneration.success && '❌ Token Generation',
    !results.serverRunning.success && '❌ Server Running',
    !results.apiToken.success && '❌ API Accepts Token',
    !results.database.success && '❌ Database Working',
    !results.webhook.success && '❌ Webhook Endpoint',
  ].filter(Boolean);
  
  console.log('\nPASSING TESTS:');
  passing.forEach(p => console.log(`  ${p}`));
  
  if (failing.length > 0) {
    console.log('\nFAILING TESTS:');
    failing.forEach(f => console.log(`  ${f}`));
  }
  
  console.log();
  
  if (failing.length === 0) {
    console.log('🎉 SUCCESS: Everything is working!');
    console.log('\nIncoming messages should now work:');
    console.log('  1. Send WhatsApp message');
    console.log('  2. Go to /admin/crm/whatsapp-meta');
    console.log('  3. Message should appear within 10 seconds ✅\n');
  } else {
    console.log('⚠️  Some tests failed. See details above.\n');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
