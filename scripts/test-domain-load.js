#!/usr/bin/env node

/**
 * Domain & Load Testing Script
 * Tests the application on domain and localhost with concurrent users
 * Verifies 20+ concurrent user capability
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3020';
const NUM_CONCURRENT_USERS = 20;
const REQUESTS_PER_USER = 5;
const ENDPOINTS = [
  '/admin/crm/leads-followup',
  '/admin/crm/whatsapp-groups',
  '/api/admin/crm/whatsapp/qr-bridge?path=%2Fstatus',
  '/api/health',
];

// Results tracking
const results = {
  successful: 0,
  failed: 0,
  totalRequests: 0,
  totalTime: 0,
  responses: {},
  errors: [],
};

// Utilities
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        resolve({
          status: res.statusCode,
          responseTime,
          contentLength: res.headers['content-length'] || data.length,
          url,
          success: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });

    req.on('error', (err) => {
      reject({
        error: err.message,
        url,
        responseTime: Date.now() - startTime,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Timeout',
        url,
        responseTime: 10000,
      });
    });
  });
}

async function testEndpoint(endpoint, userId) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const result = await makeRequest(url);
    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
      results.errors.push(`User ${userId}: ${url} returned ${result.status}`);
    }
    results.totalTime += result.responseTime;
    
    // Track response times by endpoint
    if (!results.responses[endpoint]) {
      results.responses[endpoint] = [];
    }
    results.responses[endpoint].push(result.responseTime);
    
    return result;
  } catch (err) {
    results.failed++;
    results.errors.push(`User ${userId}: ${url} - ${err.error}`);
    return err;
  }
}

async function simulateUser(userId) {
  const randomEndpoints = ENDPOINTS.sort(() => Math.random() - 0.5);
  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    const endpoint = randomEndpoints[i % randomEndpoints.length];
    await testEndpoint(endpoint, userId);
    results.totalRequests++;
  }
}

async function runLoadTest() {
  console.log('🚀 Starting Domain & Load Test\n');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`👥 Concurrent Users: ${NUM_CONCURRENT_USERS}`);
  console.log(`📊 Requests per User: ${REQUESTS_PER_USER}`);
  console.log(`📝 Total Expected Requests: ${NUM_CONCURRENT_USERS * REQUESTS_PER_USER}\n`);
  
  console.log('🔄 Running concurrent user simulation...\n');

  const startTime = Date.now();
  
  // Create user simulations
  const userPromises = [];
  for (let i = 1; i <= NUM_CONCURRENT_USERS; i++) {
    userPromises.push(simulateUser(i));
  }

  // Wait for all users to complete
  await Promise.all(userPromises);

  const totalDuration = Date.now() - startTime;

  // Calculate statistics
  const successRate = ((results.successful / results.totalRequests) * 100).toFixed(2);
  const avgResponseTime = (results.totalTime / results.totalRequests).toFixed(2);
  const requestsPerSecond = ((results.totalRequests / (totalDuration / 1000))).toFixed(2);

  // Print results
  console.log('\n📊 LOAD TEST RESULTS\n');
  console.log('═'.repeat(60));
  console.log(`✅ Successful Requests: ${results.successful}`);
  console.log(`❌ Failed Requests: ${results.failed}`);
  console.log(`📊 Total Requests: ${results.totalRequests}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
  console.log(`📈 Success Rate: ${successRate}%`);
  console.log(`⚡ Avg Response Time: ${avgResponseTime}ms`);
  console.log(`🚄 Throughput: ${requestsPerSecond} req/s`);
  console.log('═'.repeat(60));

  // Endpoint specific stats
  console.log('\n📍 ENDPOINT STATISTICS\n');
  for (const [endpoint, times] of Object.entries(results.responses)) {
    const min = Math.min(...times);
    const max = Math.max(...times);
    const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
    console.log(`${endpoint}`);
    console.log(`  ├─ Min: ${min}ms | Max: ${max}ms | Avg: ${avg}ms | Count: ${times.length}`);
  }

  // Errors
  if (results.errors.length > 0) {
    console.log('\n⚠️  ERRORS DETECTED\n');
    results.errors.slice(0, 10).forEach(err => {
      console.log(`  • ${err}`);
    });
    if (results.errors.length > 10) {
      console.log(`  ... and ${results.errors.length - 10} more errors`);
    }
  }

  // Health status
  console.log('\n🏥 SYSTEM HEALTH\n');
  if (successRate >= 95) {
    console.log('✅ System is HEALTHY - 20+ concurrent users supported');
  } else if (successRate >= 80) {
    console.log('⚠️  System has ISSUES - Some requests failed');
  } else {
    console.log('❌ System FAILED - Too many errors for production');
  }

  // Domain check
  console.log('\n🌐 DOMAIN CHECK\n');
  if (BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1')) {
    console.log('📌 Running on LOCALHOST - Test on domain for production verification');
  } else {
    console.log(`✅ Running on DOMAIN: ${BASE_URL}`);
    if (successRate >= 95) {
      console.log('✅ Domain is working properly with multiple concurrent users');
    }
  }

  process.exit(successRate >= 80 ? 0 : 1);
}

// Run the test
runLoadTest().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
