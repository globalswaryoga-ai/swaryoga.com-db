/**
 * Unit tests for validation utilities
 * Run: npm test -- tests/validation.test.ts
 */

import {
  validateObjectId,
  validateEmail,
  validatePhoneNumber,
  validateStringLength,
  sanitizeString,
  validatePositiveNumber,
  validateFields,
  extractAllowedFields,
  ValidationError,
} from '@/lib/validation';

describe('Validation Utilities', () => {
  describe('validateObjectId', () => {
    it('should validate valid MongoDB ObjectId', () => {
      expect(validateObjectId('507f1f77bcf86cd799439011')).toBe(true);
    });

    it('should reject invalid ObjectId', () => {
      expect(validateObjectId('invalid')).toBe(false);
      expect(validateObjectId(123)).toBe(false);
      expect(validateObjectId(null)).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail(123)).toBe(false);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate phone numbers', () => {
      expect(validatePhoneNumber('+12025551234')).toBe(true);
      expect(validatePhoneNumber('+919876543210')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('notaphone')).toBe(false);
    });
  });

  describe('validateStringLength', () => {
    it('should validate string length', () => {
      expect(validateStringLength('hello', 0, 10)).toBe(true);
      expect(validateStringLength('test', 0, 100)).toBe(true);
    });

    it('should reject strings outside bounds', () => {
      expect(validateStringLength('hello', 10, 100)).toBe(false);
      expect(validateStringLength('test', 0, 2)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should escape HTML entities', () => {
      expect(sanitizeString('<script>')).toBe('&lt;script&gt;');
      expect(sanitizeString('user&admin')).toBe('user&amp;admin');
      expect(sanitizeString('"quoted"')).toBe('&quot;quoted&quot;');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString(null)).toBe('');
    });
  });

  describe('validatePositiveNumber', () => {
    it('should validate positive numbers', () => {
      expect(validatePositiveNumber(5)).toBe(true);
      expect(validatePositiveNumber(0.1)).toBe(true);
    });

    it('should reject non-positive numbers', () => {
      expect(validatePositiveNumber(0)).toBe(false);
      expect(validatePositiveNumber(-5)).toBe(false);
      expect(validatePositiveNumber('5')).toBe(false);
    });
  });

  describe('validateFields', () => {
    it('should validate multiple fields', () => {
      const data = { name: 'John', email: 'john@example.com' };
      const rules = {
        name: { required: true, type: 'string' },
        email: { required: true, type: 'string' },
      };

      const result = validateFields(data, rules);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch validation errors', () => {
      const data = { name: '', email: 'invalid' };
      const rules = {
        name: { required: true, minLength: 3 },
        email: { required: true, type: 'string' },
      };

      const result = validateFields(data, rules);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('extractAllowedFields', () => {
    it('should extract only allowed fields', () => {
      const obj = { id: 1, name: 'Test', secret: 'hidden', admin: true };
      const allowed = ['id', 'name'];

      const result = extractAllowedFields(obj, allowed);
      expect(result).toEqual({ id: 1, name: 'Test' });
      expect(result).not.toHaveProperty('secret');
      expect(result).not.toHaveProperty('admin');
    });
  });
});

describe('Security Utilities', () => {
  describe('Input Sanitization', () => {
    it('should prevent XSS attacks', () => {
      const malicious = '<img src=x onerror="alert(1)">';
      const sanitized = sanitizeString(malicious);
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).toContain('&lt;');
    });

    it('should handle encoded attacks', () => {
      const input = '&#60;script&#62;alert("xss")&#60;/script&#62;';
      const sanitized = sanitizeString(input);
      expect(sanitized.length).toBeGreaterThan(0);
    });
  });
});
