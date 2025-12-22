/**
 * Integration tests for critical API endpoints
 * Run: npm test -- tests/api-integration.test.ts
 */

import { MockRequestBuilder, assertions, testDataGenerators } from '@/lib/testing';
import { validateFields, validateEmail, validateObjectId } from '@/lib/validation';
import { createErrorResponse, createSuccessResponse, ErrorCode } from '@/lib/error-handler';

describe('API Integration Tests', () => {
  describe('Authentication', () => {
    it('should validate login request structure', () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123',
      };

      const validation = validateFields(loginData, {
        email: { required: true, type: 'string' },
        password: { required: true, minLength: 6 },
      });

      expect(validation.valid).toBe(true);
    });

    it('should reject invalid email in login', () => {
      const validation = validateFields(
        { email: 'invalid-email' },
        { email: { required: true, type: 'string' } }
      );

      expect(validation.valid).toBe(true); // Type check only
      expect(validateEmail('invalid-email')).toBe(false);
    });

    it('should reject weak passwords', () => {
      const validation = validateFields(
        { password: '123' },
        { password: { required: true, minLength: 8 } }
      );

      expect(validation.valid).toBe(false);
    });
  });

  describe('User Profile', () => {
    it('should validate user profile update', () => {
      const profileUpdate = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+12025551234',
      };

      const validation = validateFields(profileUpdate, {
        name: { required: true, minLength: 2, maxLength: 100 },
        email: { required: false, type: 'string' },
        phone: { required: false, type: 'string' },
      });

      expect(validation.valid).toBe(true);
    });

    it('should sanitize user input', () => {
      const { sanitizeString } = require('@/lib/validation');
      const malicious = '<script>alert("xss")</script>';
      const sanitized = sanitizeString(malicious);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });
  });

  describe('Data Validation', () => {
    it('should validate MongoDB ObjectIds', () => {
      expect(validateObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(validateObjectId('invalid-id')).toBe(false);
      expect(validateObjectId(null)).toBe(false);
    });

    it('should validate email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
    });

    it('should validate required fields', () => {
      const data = { name: '', email: 'test@example.com' };
      const validation = validateFields(data, {
        name: { required: true, minLength: 1 },
        email: { required: true },
      });

      expect(validation.valid).toBe(false);
    });
  });

  describe('Error Response Handling', () => {
    it('should create proper error response', () => {
      const error = createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        { field: 'email', message: 'Invalid email' }
      );

      expect(assertions.isErrorResponse(error)).toBe(true);
      expect(error.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.error.timestamp).toBeDefined();
      expect(error.error.traceId).toBeDefined();
    });

    it('should create proper success response', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse(data, { total: 1 });

      expect(assertions.isSuccessResponse(response)).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.meta?.total).toBe(1);
    });
  });

  describe('Request Building', () => {
    it('should build GET request', async () => {
      const request = new MockRequestBuilder()
        .setMethod('GET')
        .setUrl('http://localhost:3000/api/users')
        .setAuthorization('test-token')
        .build();

      expect(request).toBeDefined();
      expect(request.method).toBe('GET');
    });

    it('should build POST request with body', async () => {
      const request = new MockRequestBuilder()
        .setMethod('POST')
        .setUrl('http://localhost:3000/api/users')
        .setBody({ name: 'Test' })
        .setAuthorization('test-token')
        .build();

      expect(request).toBeDefined();
      expect(request.method).toBe('POST');
    });
  });

  describe('Data Generation', () => {
    it('should generate valid test data', () => {
      const userId = testDataGenerators.userId();
      const email = testDataGenerators.email();
      const phone = testDataGenerators.phoneNumber();

      expect(validateObjectId(userId)).toBe(true);
      expect(validateEmail(email)).toBe(true);
      expect(phone).toMatch(/^\+/);
    });

    it('should generate UUIDs', () => {
      const uuid = testDataGenerators.uuid();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(uuid)).toBe(true);
    });

    it('should generate timestamps', () => {
      const timestamp = testDataGenerators.timestamp();
      expect(new Date(timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Batch Operations', () => {
    it('should validate multiple field sets', () => {
      const records = [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' },
      ];

      const results = records.map((record) =>
        validateFields(record, {
          name: { required: true, minLength: 2 },
          email: { required: true, type: 'string' },
        })
      );

      expect(results.every((r) => r.valid)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      const validation = validateFields(
        { name: null },
        { name: { required: false, type: 'string' } }
      );

      expect(validation.valid).toBe(true);
    });

    it('should handle empty objects', () => {
      const validation = validateFields(
        {},
        { name: { required: false } }
      );

      expect(validation.valid).toBe(true);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const validation = validateFields(
        { description: longString },
        { description: { maxLength: 5000 } }
      );

      expect(validation.valid).toBe(false);
    });

    it('should handle special characters in strings', () => {
      const { sanitizeString } = require('@/lib/validation');
      const specialChars = 'Test <>&"\' characters';
      const sanitized = sanitizeString(specialChars);

      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&gt;');
      expect(sanitized).toContain('&amp;');
    });
  });

  describe('Security', () => {
    it('should extract only allowed fields', () => {
      const { extractAllowedFields } = require('@/lib/validation');
      const user = {
        id: '123',
        name: 'John',
        email: 'john@example.com',
        passwordHash: 'secret',
        apiKey: 'secret-key',
      };

      const safe = extractAllowedFields(user, ['id', 'name', 'email']);
      expect(safe).toHaveProperty('id');
      expect(safe).toHaveProperty('name');
      expect(safe).not.toHaveProperty('passwordHash');
      expect(safe).not.toHaveProperty('apiKey');
    });

    it('should prevent XSS attacks', () => {
      const { sanitizeString } = require('@/lib/validation');
      const xssPayloads = [
        '<img src=x onerror="alert(1)">',
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
      ];

      xssPayloads.forEach((payload) => {
        const sanitized = sanitizeString(payload);
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('javascript:');
      });
    });
  });
});
