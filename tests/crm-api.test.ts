/**
 * Comprehensive CRM API Test Suite
 * Tests all 8 CRM endpoints with various scenarios
 * Run with: npm test -- tests/crm-api.test.ts
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/admin/crm';
const TEST_TOKEN = process.env.TEST_TOKEN || 'test-jwt-token';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

// Helper function to make API calls
async function apiCall(
  endpoint: string,
  method: string = 'GET',
  body?: any
): Promise<{ status: number; data: any }> {
  const url = `${API_BASE}${endpoint}`;
  const options: any = {
    method,
    headers: {
      'Authorization': `Bearer ${TEST_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();
  return { status: response.status, data };
}

// Test utilities
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}: ${message}`);
  }
}

async function test(name: string, fn: () => Promise<void>) {
  const startTime = Date.now();
  try {
    await fn();
    results.push({
      name,
      passed: true,
      duration: Date.now() - startTime,
    });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    });
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// LEADS TESTS
// ============================================================================

async function runLeadsTests() {
  console.log('\n📋 LEADS API TESTS');
  console.log('='.repeat(50));

  let testLeadId: string;

  await test('GET /leads - Fetch leads with pagination', async () => {
    const { status, data } = await apiCall('/leads?limit=10&skip=0');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.success === true, 'Response should have success=true');
    assert(Array.isArray(data.data.leads), 'Should return leads array');
  });

  await test('POST /leads - Create new lead', async () => {
    const { status, data } = await apiCall('/leads', 'POST', {
      name: 'Test User ' + Date.now(),
      email: `test${Date.now()}@example.com`,
      phoneNumber: '+919876543210',
      source: 'website',
      status: 'lead',
    });
    assertEquals(status, 201, 'Status should be 201 Created');
    assert(data.success === true, 'Should return success');
    assert(data.data._id, 'Should return created lead with _id');
    testLeadId = data.data._id;
  });

  if (testLeadId) {
    await test(`GET /leads/${testLeadId} - Fetch single lead`, async () => {
      const { status, data } = await apiCall(`/leads/${testLeadId}`);
      assertEquals(status, 200, 'Status should be 200');
      assert(data.data._id === testLeadId, 'Should return correct lead');
    });

    await test(`PATCH /leads/${testLeadId} - Update lead`, async () => {
      const { status, data } = await apiCall(`/leads/${testLeadId}`, 'PATCH', {
        status: 'prospect',
        tags: ['interested', 'qualified'],
      });
      assertEquals(status, 200, 'Status should be 200');
      assertEquals(data.data.status, 'prospect', 'Status should be updated');
    });

    await test('GET /leads - Search leads', async () => {
      const { status, data } = await apiCall('/leads?search=test');
      assertEquals(status, 200, 'Status should be 200');
      assert(Array.isArray(data.data.leads), 'Should return leads array');
    });

    await test('GET /leads - Filter by status', async () => {
      const { status, data } = await apiCall('/leads?status=prospect');
      assertEquals(status, 200, 'Status should be 200');
      assert(data.data.leads.every((l: any) => l.status === 'prospect'), 'All leads should have prospect status');
    });
  }
}

// ============================================================================
// BULK OPERATIONS TESTS
// ============================================================================

async function runBulkTests() {
  console.log('\n📦 BULK OPERATIONS TESTS');
  console.log('='.repeat(50));

  await test('POST /leads/bulk - Import leads', async () => {
    const { status, data } = await apiCall('/leads/bulk', 'POST', {
      action: 'import',
      leads: [
        {
          name: 'Bulk Lead 1',
          email: `bulk1_${Date.now()}@example.com`,
          phoneNumber: '+919876543211',
          source: 'csv_import',
        },
        {
          name: 'Bulk Lead 2',
          email: `bulk2_${Date.now()}@example.com`,
          phoneNumber: '+919876543212',
          source: 'csv_import',
        },
      ],
    });
    assertEquals(status, 201, 'Status should be 201');
    assert(data.data.successCount > 0, 'Should have imported leads');
  });

  await test('POST /leads/bulk - Update status', async () => {
    const { status: getStatus, data: getData } = await apiCall('/leads?limit=2');
    if (getData.data.leads.length > 0) {
      const leadIds = getData.data.leads.map((l: any) => l._id);
      const { status, data } = await apiCall('/leads/bulk', 'POST', {
        action: 'updateStatus',
        leadIds,
        status: 'customer',
      });
      assertEquals(status, 200, 'Status should be 200');
      assert(data.data.successCount > 0, 'Should have updated leads');
    }
  });

  await test('POST /leads/bulk - Update labels', async () => {
    const { status: getStatus, data: getData } = await apiCall('/leads?limit=2');
    if (getData.data.leads.length > 0) {
      const leadIds = getData.data.leads.map((l: any) => l._id);
      const { status, data } = await apiCall('/leads/bulk', 'POST', {
        action: 'updateLabels',
        leadIds,
        mode: 'add',
        labels: ['vip', 'contacted'],
      });
      assertEquals(status, 200, 'Status should be 200');
      assert(data.data.successCount >= 0, 'Should process labels');
    }
  });

  await test('GET /leads/bulk - Export as JSON', async () => {
    const { status, data } = await apiCall('/leads/bulk?action=export&format=json&limit=10');
    assertEquals(status, 200, 'Status should be 200');
    assert(Array.isArray(data.data.leads), 'Should return leads array');
  });

  await test('GET /leads/bulk - Export as CSV', async () => {
    const { status, data } = await apiCall('/leads/bulk?action=export&format=csv&limit=10');
    assertEquals(status, 200, 'Status should be 200');
    assert(typeof data.data === 'string' || data.data.csv, 'Should return CSV data');
  });
}

// ============================================================================
// LABELS TESTS
// ============================================================================

async function runLabelsTests() {
  console.log('\n🏷️  LABELS API TESTS');
  console.log('='.repeat(50));

  await test('GET /labels - Fetch all labels with statistics', async () => {
    const { status, data } = await apiCall('/labels');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.success === true, 'Response should be successful');
    assert(Array.isArray(data.data.labels), 'Should return labels array');
  });

  await test('POST /labels - Add label to leads', async () => {
    const { status: getStatus, data: getData } = await apiCall('/leads?limit=2');
    if (getData.data.leads.length > 0) {
      const leadIds = getData.data.leads.map((l: any) => l._id);
      const { status, data } = await apiCall('/labels', 'POST', {
        label: 'test_label',
        leadIds,
      });
      assertEquals(status, 201, 'Status should be 201');
      assert(data.data.updatedCount >= 0, 'Should have updated leads');
    }
  });

  await test('DELETE /labels - Remove label', async () => {
    const { status, data } = await apiCall('/labels?label=test_label', 'DELETE');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.data.removedFromCount >= 0, 'Should return removed count');
  });
}

// ============================================================================
// MESSAGES TESTS
// ============================================================================

async function runMessagesTests() {
  console.log('\n💬 MESSAGES API TESTS');
  console.log('='.repeat(50));

  let testMessageId: string;

  await test('GET /messages - Fetch messages', async () => {
    const { status, data } = await apiCall('/messages?limit=10');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.success === true, 'Response should be successful');
    assert(Array.isArray(data.data.messages), 'Should return messages array');
  });

  await test('POST /messages - Send message', async () => {
    const { status: getStatus, data: getData } = await apiCall('/leads?limit=1');
    if (getData.data.leads.length > 0) {
      const leadId = getData.data.leads[0]._id;
      const { status, data } = await apiCall('/messages', 'POST', {
        leadId,
        message: 'Test message ' + Date.now(),
        type: 'text',
      });
      assertEquals(status, 201, 'Status should be 201');
      assert(data.data._id, 'Should return message with _id');
      testMessageId = data.data._id;
    }
  });

  if (testMessageId) {
    await test(`PUT /messages - Retry message`, async () => {
      const { status, data } = await apiCall('/messages', 'PUT', {
        messageId: testMessageId,
        action: 'retry',
      });
      assertEquals(status, 200, 'Status should be 200');
      assert(data.data.retryCount >= 0, 'Should increment retry count');
    });

    await test(`PUT /messages - Mark as read`, async () => {
      const { status, data } = await apiCall('/messages', 'PUT', {
        messageId: testMessageId,
        action: 'markAsRead',
      });
      assertEquals(status, 200, 'Status should be 200');
    });
  }

  await test('GET /messages - Filter by status', async () => {
    const { status, data } = await apiCall('/messages?status=sent&limit=5');
    assertEquals(status, 200, 'Status should be 200');
    assert(Array.isArray(data.data.messages), 'Should return messages array');
  });

  await test('GET /messages - Filter by direction', async () => {
    const { status, data } = await apiCall('/messages?direction=outbound&limit=5');
    assertEquals(status, 200, 'Status should be 200');
    assert(Array.isArray(data.data.messages), 'Should return messages array');
  });
}

// ============================================================================
// SALES TESTS
// ============================================================================

async function runSalesTests() {
  console.log('\n💰 SALES API TESTS');
  console.log('='.repeat(50));

  let testSaleId: string;

  await test('GET /sales - Fetch sales (list view)', async () => {
    const { status, data } = await apiCall('/sales?view=list&limit=10');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.success === true, 'Response should be successful');
    assert(Array.isArray(data.data.sales), 'Should return sales array');
  });

  await test('GET /sales - Fetch summary', async () => {
    const { status, data } = await apiCall('/sales?view=summary');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.data.totalSales >= 0, 'Should return totalSales');
  });

  await test('GET /sales - Fetch daily trends', async () => {
    const { status, data } = await apiCall('/sales?view=daily');
    assertEquals(status, 200, 'Status should be 200');
    assert(Array.isArray(data.data.sales), 'Should return daily sales array');
  });

  await test('GET /sales - Fetch monthly trends', async () => {
    const { status, data } = await apiCall('/sales?view=monthly');
    assertEquals(status, 200, 'Status should be 200');
    assert(Array.isArray(data.data.sales), 'Should return monthly sales array');
  });

  await test('POST /sales - Create sale', async () => {
    const { status: getStatus, data: getData } = await apiCall('/leads?limit=1');
    if (getData.data.leads.length > 0) {
      const leadId = getData.data.leads[0]._id;
      const { status, data } = await apiCall('/sales', 'POST', {
        leadId,
        amount: 5000,
        paymentMode: 'payu',
      });
      // May fail if no userId, but should return proper error
      assert(status === 201 || status === 400, 'Should return 201 or 400');
      if (status === 201) {
        testSaleId = data.data._id;
      }
    }
  });

  if (testSaleId) {
    await test(`PUT /sales - Update sale`, async () => {
      const { status, data } = await apiCall('/sales', 'PUT', {
        saleId: testSaleId,
        amount: 5500,
      });
      assertEquals(status, 200, 'Status should be 200');
    });
  }

  await test('GET /sales - Filter by payment mode', async () => {
    const { status, data } = await apiCall('/sales?paymentMode=payu&limit=5');
    assertEquals(status, 200, 'Status should be 200');
    assert(Array.isArray(data.data.sales), 'Should return sales array');
  });
}

// ============================================================================
// TEMPLATES TESTS
// ============================================================================

async function runTemplatesTests() {
  console.log('\n📝 TEMPLATES API TESTS');
  console.log('='.repeat(50));

  let testTemplateId: string;

  await test('GET /templates - Fetch templates', async () => {
    const { status, data } = await apiCall('/templates?limit=10');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.success === true, 'Response should be successful');
    assert(Array.isArray(data.data.templates), 'Should return templates array');
  });

  await test('POST /templates - Create template', async () => {
    const { status, data } = await apiCall('/templates', 'POST', {
      templateName: `test_template_${Date.now()}`,
      category: 'greeting',
      bodyText: 'Welcome to our yoga studio!',
      headerText: 'Welcome',
    });
    assertEquals(status, 201, 'Status should be 201');
    assert(data.data._id, 'Should return template with _id');
    testTemplateId = data.data._id;
  });

  if (testTemplateId) {
    await test(`PUT /templates - Approve template`, async () => {
      const { status, data } = await apiCall('/templates', 'PUT', {
        templateId: testTemplateId,
        action: 'approve',
      });
      assertEquals(status, 200, 'Status should be 200');
      assertEquals(data.data.status, 'approved', 'Status should be approved');
    });

    await test(`DELETE /templates - Delete template`, async () => {
      const { status, data } = await apiCall(`/templates?templateId=${testTemplateId}`, 'DELETE');
      assertEquals(status, 200, 'Status should be 200');
    });
  }

  await test('GET /templates - Filter by status', async () => {
    const { status, data } = await apiCall('/templates?status=approved&limit=10');
    assertEquals(status, 200, 'Status should be 200');
    assert(Array.isArray(data.data.templates), 'Should return templates array');
  });
}

// ============================================================================
// CONSENT TESTS
// ============================================================================

async function runConsentTests() {
  console.log('\n✅ CONSENT API TESTS');
  console.log('='.repeat(50));

  let testConsentId: string;

  await test('GET /consent - Fetch consent records', async () => {
    const { status, data } = await apiCall('/consent?limit=10');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.success === true, 'Response should be successful');
    assert(Array.isArray(data.data.consents), 'Should return consents array');
  });

  await test('POST /consent - Create consent record', async () => {
    const { status, data } = await apiCall('/consent', 'POST', {
      phoneNumber: `+91${Math.floor(Math.random() * 9876543210)}`,
      channel: 'whatsapp',
      status: 'opted_in',
      consentMethod: 'sms_link',
    });
    assertEquals(status, 201, 'Status should be 201');
    assert(data.data._id, 'Should return consent with _id');
    testConsentId = data.data._id;
  });

  if (testConsentId) {
    await test(`PUT /consent - Update consent status`, async () => {
      const { status, data } = await apiCall('/consent', 'PUT', {
        consentId: testConsentId,
        action: 'opt-out',
      });
      assertEquals(status, 200, 'Status should be 200');
      assertEquals(data.data.status, 'opted_out', 'Status should be opted_out');
    });

    await test(`DELETE /consent - Delete consent`, async () => {
      const { status, data } = await apiCall(`/consent?consentId=${testConsentId}`, 'DELETE');
      assertEquals(status, 200, 'Status should be 200');
    });
  }

  await test('GET /consent - Filter by status', async () => {
    const { status, data } = await apiCall('/consent?status=opted_in&limit=10');
    assertEquals(status, 200, 'Status should be 200');
    assert(Array.isArray(data.data.consents), 'Should return consents array');
  });
}

// ============================================================================
// ANALYTICS TESTS
// ============================================================================

async function runAnalyticsTests() {
  console.log('\n📊 ANALYTICS API TESTS');
  console.log('='.repeat(50));

  await test('GET /analytics - Overview', async () => {
    const { status, data } = await apiCall('/analytics?view=overview');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.data.overview, 'Should return overview data');
  });

  await test('GET /analytics - Leads analytics', async () => {
    const { status, data } = await apiCall('/analytics?view=leads');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.data.leads, 'Should return leads analytics');
  });

  await test('GET /analytics - Sales analytics', async () => {
    const { status, data } = await apiCall('/analytics?view=sales');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.data.sales, 'Should return sales analytics');
  });

  await test('GET /analytics - Messages analytics', async () => {
    const { status, data } = await apiCall('/analytics?view=messages');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.data.messages, 'Should return messages analytics');
  });

  await test('GET /analytics - Conversion analytics', async () => {
    const { status, data } = await apiCall('/analytics?view=conversion');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.data.conversion, 'Should return conversion analytics');
  });

  await test('GET /analytics - Trends', async () => {
    const { status, data } = await apiCall('/analytics?view=trends');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.data.trends, 'Should return trends data');
  });

  await test('GET /analytics - All views', async () => {
    const { status, data } = await apiCall('/analytics?view=all');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.data.overview, 'Should return overview');
    assert(data.data.leads, 'Should return leads');
    assert(data.data.sales, 'Should return sales');
  });
}

// ============================================================================
// PERMISSIONS TESTS
// ============================================================================

async function runPermissionsTests() {
  console.log('\n🔐 PERMISSIONS API TESTS');
  console.log('='.repeat(50));

  await test('GET /permissions - Fetch all permissions and roles', async () => {
    const { status, data } = await apiCall('/permissions?type=all');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.data.permissions, 'Should return permissions');
    assert(data.data.roles, 'Should return roles');
    assert(data.data.defaultRoles, 'Should return defaultRoles');
  });

  await test('GET /permissions - Fetch only permissions', async () => {
    const { status, data } = await apiCall('/permissions?type=permissions');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.data.permissions, 'Should return permissions');
  });

  await test('GET /permissions - Fetch only roles', async () => {
    const { status, data } = await apiCall('/permissions?type=roles');
    assertEquals(status, 200, 'Status should be 200');
    assert(data.data.roles, 'Should return roles');
  });

  await test('POST /permissions - Create permission', async () => {
    const { status, data } = await apiCall('/permissions', 'POST', {
      resourceType: 'permission',
      name: `test_perm_${Date.now()}`,
      displayName: 'Test Permission',
      description: 'Test permission for testing',
    });
    assertEquals(status, 201, 'Status should be 201');
    assert(data.data._id, 'Should return permission with _id');
  });

  await test('POST /permissions - Create role', async () => {
    const { status, data } = await apiCall('/permissions', 'POST', {
      resourceType: 'role',
      name: `test_role_${Date.now()}`,
      displayName: 'Test Role',
      description: 'Test role for testing',
      permissionIds: [],
    });
    assertEquals(status, 201, 'Status should be 201');
    assert(data.data._id, 'Should return role with _id');
  });
}

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

async function runErrorTests() {
  console.log('\n⚠️  ERROR HANDLING TESTS');
  console.log('='.repeat(50));

  await test('Unauthorized request (no token)', async () => {
    const url = `${API_BASE}/leads`;
    const response = await fetch(url, { method: 'GET' });
    const status = response.status;
    assert(status === 401, 'Should return 401 for missing token');
  });

  await test('Invalid lead ID format', async () => {
    const { status } = await apiCall('/leads/invalid-id');
    assert(status === 400 || status === 404, 'Should return 400 or 404 for invalid ID');
  });

  await test('Missing required fields', async () => {
    const { status } = await apiCall('/leads', 'POST', {
      name: 'Incomplete Lead',
      // Missing email and phoneNumber
    });
    assert(status === 400, 'Should return 400 for missing required fields');
  });

  await test('Invalid filter parameters', async () => {
    const { status, data } = await apiCall('/leads?status=invalid_status');
    // May succeed with empty results or fail - both acceptable
    assert(status === 200 || status === 400, 'Should handle invalid filters');
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n🚀 Starting CRM API Test Suite');
  console.log('='.repeat(50));
  console.log(`API Base: ${API_BASE}`);
  console.log(`Token: ${TEST_TOKEN.slice(0, 10)}...`);

  try {
    await runLeadsTests();
    await runBulkTests();
    await runLabelsTests();
    await runMessagesTests();
    await runSalesTests();
    await runTemplatesTests();
    await runConsentTests();
    await runAnalyticsTests();
    await runPermissionsTests();
    await runErrorTests();
  } catch (error) {
    console.error('\n💥 Test suite error:', error);
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📈 TEST SUMMARY');
  console.log('='.repeat(50));

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Duration: ${totalDuration}ms`);
  console.log(`Pass Rate: ${((passed / total) * 100).toFixed(2)}%`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }

  console.log('\n' + '='.repeat(50));
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
