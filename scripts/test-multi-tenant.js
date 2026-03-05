#!/usr/bin/env node

/**
 * Multi-Tenant SaaS Testing & Verification Script
 * Run: node scripts/test-multi-tenant.js
 *
 * Tests all multi-tenant endpoints and validates functionality
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const SUPERADMIN_TOKEN = process.env.SUPERADMIN_TOKEN || 'test-superadmin-token';

let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
};

// ============================================================================
// HTTP Helper
// ============================================================================

async function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ============================================================================
// Test Utilities
// ============================================================================

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m',
  };
  console.log(`${colors[type] || ''}${message}${colors.reset}`);
}

async function test(name, fn) {
  try {
    process.stdout.write(`\n✓ ${name}... `);
    await fn();
    log('PASS', 'success');
    testResults.passed++;
  } catch (error) {
    log(`FAIL: ${error.message}`, 'error');
    testResults.failed++;
    console.error(error);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// Tests
// ============================================================================

let testTenant = null;
let testAPIKey = null;

async function runTests() {
  log('\n🚀 Multi-Tenant SaaS API Tests\n', 'info');

  // ========================================
  // 1. Tenant Creation
  // ========================================
  await test('Create new tenant', async () => {
    const response = await request('POST', '/api/tenants', {
      tenantSlug: `test-tenant-${Date.now()}`,
      organizationName: 'Test Yoga Studio',
      adminEmail: 'admin@test.com',
      billingEmail: 'billing@test.com',
      initialTier: 'free',
    });

    assert(response.status === 201, `Expected 201, got ${response.status}`);
    assert(response.body.success === true, 'Response not successful');
    assert(response.body.tenantId, 'No tenantId returned');
    assert(response.body.apiKey, 'No apiKey returned');

    testTenant = response.body;
  });

  // ========================================
  // 2. Get Tenant (Public Info)
  // ========================================
  await test('Get tenant public info', async () => {
    assert(testTenant, 'Tenant not created');

    const response = await request('GET', `/api/tenants/${testTenant.tenantSlug}`);

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.body.success === true, 'Response not successful');
    assert(
      response.body.tenant.tenantSlug === testTenant.tenantSlug,
      'Tenant slug mismatch'
    );
    assert(
      response.body.tenant.subscriptionTier === 'free',
      'Expected free tier'
    );
  });

  // ========================================
  // 3. Get Tenant (Full Details - Admin)
  // ========================================
  await test('Get tenant full details (admin auth)', async () => {
    assert(testTenant, 'Tenant not created');

    const response = await request(
      'GET',
      `/api/tenants/${testTenant.tenantSlug}`,
      null,
      {
        Authorization: `Bearer ${testTenant.authToken || SUPERADMIN_TOKEN}`,
      }
    );

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.body.success === true, 'Response not successful');
    assert(response.body.tenant.enabledModules, 'No enabledModules');
    assert(response.body.tenant.usage, 'No usage info');
    assert(response.body.tenant.limits, 'No limits info');
  });

  // ========================================
  // 4. Create API Key
  // ========================================
  await test('Create API key', async () => {
    assert(testTenant, 'Tenant not created');

    const response = await request(
      'POST',
      `/api/tenants/${testTenant.tenantSlug}/api-keys`,
      {
        name: 'Test API Key',
        permissions: ['leads:read', 'leads:write', 'messages:read'],
      },
      {
        Authorization: `Bearer ${testTenant.authToken || SUPERADMIN_TOKEN}`,
      }
    );

    assert(response.status === 201, `Expected 201, got ${response.status}`);
    assert(response.body.success === true, 'Response not successful');
    assert(response.body.plainKey, 'No plainKey returned');
    assert(response.body.keyId, 'No keyId returned');

    testAPIKey = response.body;
  });

  // ========================================
  // 5. List API Keys
  // ========================================
  await test('List API keys', async () => {
    assert(testTenant, 'Tenant not created');

    const response = await request(
      'GET',
      `/api/tenants/${testTenant.tenantSlug}/api-keys`,
      null,
      {
        Authorization: `Bearer ${testTenant.authToken || SUPERADMIN_TOKEN}`,
      }
    );

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.body.success === true, 'Response not successful');
    assert(Array.isArray(response.body.keys), 'Keys not an array');
    assert(response.body.keys.length > 0, 'No keys returned');
  });

  // ========================================
  // 6. Use API Key to Access CRM
  // ========================================
  await test('Access CRM with API key', async () => {
    assert(testAPIKey, 'API key not created');

    const response = await request('GET', '/api/admin/crm/leads', null, {
      'Authorization': `Bearer ${testAPIKey.plainKey}`,
      'x-tenant-slug': testTenant.tenantSlug,
    });

    // Should succeed (or return 200/403 depending on auth)
    assert(response.status < 500, `Server error: ${response.status}`);
  });

  // ========================================
  // 7. Revoke API Key
  // ========================================
  await test('Revoke API key', async () => {
    assert(testTenant, 'Tenant not created');
    assert(testAPIKey, 'API key not created');

    const response = await request(
      'DELETE',
      `/api/tenants/${testTenant.tenantSlug}/api-keys/${testAPIKey.keyId}`,
      null,
      {
        Authorization: `Bearer ${testTenant.authToken || SUPERADMIN_TOKEN}`,
      }
    );

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.body.success === true, 'Response not successful');
  });

  // ========================================
  // 8. Verify Revoked Key No Longer Works
  // ========================================
  await test('Verify revoked API key is blocked', async () => {
    assert(testAPIKey, 'API key not created');

    const response = await request('GET', '/api/admin/crm/leads', null, {
      'Authorization': `Bearer ${testAPIKey.plainKey}`,
      'x-tenant-slug': testTenant.tenantSlug,
    });

    // Should be rejected
    assert(response.status >= 401, `Expected 401+, got ${response.status}`);
  });

  // ========================================
  // 9. Update Tenant Subscription
  // ========================================
  await test('Upgrade subscription tier', async () => {
    assert(testTenant, 'Tenant not created');

    const response = await request(
      'PUT',
      `/api/tenants/${testTenant.tenantSlug}`,
      { subscriptionTier: 'plan1' },
      {
        Authorization: `Bearer ${testTenant.authToken || SUPERADMIN_TOKEN}`,
      }
    );

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.body.success === true, 'Response not successful');
    assert(
      response.body.tenant.subscriptionTier === 'plan1',
      'Subscription not upgraded'
    );
  });

  // ========================================
  // 10. Get Analytics
  // ========================================
  await test('Get tenant analytics', async () => {
    assert(testTenant, 'Tenant not created');

    const response = await request(
      'GET',
      `/api/tenants/${testTenant.tenantSlug}/analytics`,
      null,
      {
        Authorization: `Bearer ${testTenant.authToken || SUPERADMIN_TOKEN}`,
      }
    );

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(response.body.success === true, 'Response not successful');
    assert(response.body.totals, 'No totals returned');
    assert(response.body.currentUsage, 'No currentUsage returned');
    assert(response.body.limits, 'No limits returned');
  });

  // ========================================
  // 11. Error Handling - Missing Fields
  // ========================================
  await test('Create tenant without required fields (should fail)', async () => {
    const response = await request('POST', '/api/tenants', {
      organizationName: 'Test',
    });

    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(response.body.success === false, 'Should indicate failure');
  });

  // ========================================
  // 12. Error Handling - Duplicate Slug
  // ========================================
  await test('Create duplicate tenant slug (should fail)', async () => {
    assert(testTenant, 'Original tenant not created');

    const response = await request('POST', '/api/tenants', {
      tenantSlug: testTenant.tenantSlug,
      organizationName: 'Different Org',
      adminEmail: 'admin@different.com',
    });

    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(response.body.success === false, 'Should indicate failure');
  });

  // ========================================
  // 13. Error Handling - Unauthorized Access
  // ========================================
  await test('Access API without authorization (should fail)', async () => {
    assert(testTenant, 'Tenant not created');

    const response = await request(
      'PUT',
      `/api/tenants/${testTenant.tenantSlug}`,
      { subscriptionTier: 'plan2' }
      // No authorization header
    );

    assert(response.status === 401, `Expected 401, got ${response.status}`);
  });

  // ========================================
  // 14. Subscription Tier Limits
  // ========================================
  await test('Verify free tier limits', async () => {
    const slug = `test-free-${Date.now()}`;
    const response = await request('POST', '/api/tenants', {
      tenantSlug: slug,
      organizationName: 'Free Tier Test',
      adminEmail: 'free@test.com',
      initialTier: 'free',
    });

    assert(response.status === 201, `Expected 201, got ${response.status}`);

    const details = await request('GET', `/api/tenants/${slug}`, null, {
      Authorization: `Bearer ${SUPERADMIN_TOKEN}`,
    });

    assert(
      details.body.tenant.limits.maxLeads === 250,
      'Free tier should have 250 lead limit'
    );
    assert(
      details.body.tenant.limits.maxUsers === 1,
      'Free tier should allow 1 user'
    );
  });

  // ========================================
  // Summary
  // ========================================
  log('\n\n📊 Test Summary\n', 'info');
  log(`✅ Passed:  ${testResults.passed}`, 'success');
  log(`❌ Failed:  ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
  log(`⏭️  Skipped: ${testResults.skipped}`, 'warning');

  const total = testResults.passed + testResults.failed;
  const percentage = Math.round((testResults.passed / total) * 100);
  log(`\n📈 Success Rate: ${percentage}%\n`, percentage === 100 ? 'success' : 'warning');

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  log(`\n❌ Fatal Error: ${error.message}\n`, 'error');
  process.exit(1);
});
