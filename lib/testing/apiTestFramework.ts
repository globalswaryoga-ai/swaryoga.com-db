// lib/testing/apiTestFramework.ts
// Comprehensive API testing utilities

export interface TestCase {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  expectedStatus: number;
  expectedFields?: string[];
  validate?: (response: unknown) => boolean;
  skipAuth?: boolean;
}

export interface TestResult {
  passed: number;
  failed: number;
  errors: Array<{ test: string; error: string }>;
  duration: number;
  coverage: {
    endpoints: Set<string>;
    statusCodes: Set<number>;
  };
}

class APITester {
  private baseUrl: string;
  private token?: string;
  private results: TestResult = {
    passed: 0,
    failed: 0,
    errors: [],
    duration: 0,
    coverage: { endpoints: new Set(), statusCodes: new Set() },
  };

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string): void {
    this.token = token;
  }

  async runTest(testCase: TestCase): Promise<boolean> {
    try {
      const url = `${this.baseUrl}${testCase.path}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...testCase.headers,
      };

      // Add auth token if available and not skipped
      if (this.token && !testCase.skipAuth) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, {
        method: testCase.method,
        headers,
        body: testCase.body ? JSON.stringify(testCase.body) : undefined,
      });

      const data = await response.json();

      // Track coverage
      this.results.coverage.endpoints.add(`${testCase.method} ${testCase.path}`);
      this.results.coverage.statusCodes.add(response.status);

      // Check status code
      if (response.status !== testCase.expectedStatus) {
        this.results.failed++;
        this.results.errors.push({
          test: testCase.name,
          error: `Expected status ${testCase.expectedStatus}, got ${response.status}`,
        });
        return false;
      }

      // Check expected fields
      if (testCase.expectedFields) {
        for (const field of testCase.expectedFields) {
          if (!(field in (data as Record<string, unknown>))) {
            this.results.failed++;
            this.results.errors.push({
              test: testCase.name,
              error: `Expected field '${field}' not found in response`,
            });
            return false;
          }
        }
      }

      // Custom validation
      if (testCase.validate && !testCase.validate(data)) {
        this.results.failed++;
        this.results.errors.push({
          test: testCase.name,
          error: 'Custom validation failed',
        });
        return false;
      }

      this.results.passed++;
      return true;
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({
        test: testCase.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async runSuite(tests: TestCase[]): Promise<TestResult> {
    const startTime = Date.now();

    for (const test of tests) {
      await this.runTest(test);
    }

    this.results.duration = Date.now() - startTime;
    return this.results;
  }

  getResults(): TestResult {
    return this.results;
  }

  generateReport(): string {
    const { passed, failed, errors, duration, coverage } = this.results;
    const total = passed + failed;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;

    let report = `
╔════════════════════════════════════════════════════════════════════════╗
║                      API TEST REPORT                                  ║
╚════════════════════════════════════════════════════════════════════════╝

📊 RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Tests:      ${total}
  ✅ Passed:        ${passed}
  ❌ Failed:        ${failed}
  Pass Rate:        ${passRate}%
  Duration:         ${duration}ms

📈 COVERAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Endpoints Tested:  ${coverage.endpoints.size}
  Status Codes:      ${Array.from(coverage.statusCodes).sort().join(', ')}

`;

    if (errors.length > 0) {
      report += `\n❌ FAILURES\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      errors.forEach((err, idx) => {
        report += `\n${idx + 1}. ${err.test}\n   Error: ${err.error}\n`;
      });
    }

    report += `\n═══════════════════════════════════════════════════════════════════════════\n`;
    return report;
  }
}

export default APITester;

// Public endpoint test suite
export const publicEndpointTests: TestCase[] = [
  {
    name: 'Get workshops list',
    method: 'GET',
    path: '/api/workshops/list',
    expectedStatus: 200,
    expectedFields: ['success', 'data'],
    skipAuth: true,
  },
  {
    name: 'Get workshop schedules',
    method: 'GET',
    path: '/api/workshops/schedules',
    expectedStatus: 200,
    expectedFields: ['success', 'data'],
    skipAuth: true,
  },
  {
    name: 'Check availability',
    method: 'GET',
    path: '/api/workshops/availability?scheduleId=test-123',
    expectedStatus: 200,
    expectedFields: ['success', 'data'],
    skipAuth: true,
  },
  {
    name: 'Get offers',
    method: 'GET',
    path: '/api/offers',
    expectedStatus: 200,
    expectedFields: ['success', 'data'],
    skipAuth: true,
  },
];

// Protected endpoint test suite
export const protectedEndpointTests: TestCase[] = [
  {
    name: 'Get user profile',
    method: 'GET',
    path: '/api/auth/me',
    expectedStatus: 200,
    expectedFields: ['success', 'data'],
  },
  {
    name: 'Get user orders',
    method: 'GET',
    path: '/api/orders',
    expectedStatus: 200,
    expectedFields: ['success', 'data'],
  },
  {
    name: 'Get user registrations',
    method: 'GET',
    path: '/api/workshops/registrations',
    expectedStatus: 200,
    expectedFields: ['success', 'data'],
  },
];
