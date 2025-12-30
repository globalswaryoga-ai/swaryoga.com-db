// lib/security/validation.ts
// Comprehensive input validation and sanitization

import type { NextRequest } from 'next/server';

export interface ValidationRule {
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  type?: 'email' | 'phone' | 'url' | 'number' | 'string';
  sanitize?: boolean;
  allowedValues?: string[];
}

export const ValidationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 254,
    type: 'email',
    sanitize: true,
  } as ValidationRule,

  phone: {
    pattern: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
    type: 'phone',
    sanitize: true,
  } as ValidationRule,

  password: {
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    type: 'string',
  } as ValidationRule,

  url: {
    pattern: /^https?:\/\/.+/,
    maxLength: 2048,
    type: 'url',
    sanitize: true,
  } as ValidationRule,

  workshopId: {
    pattern: /^[a-z0-9-]+$/,
    maxLength: 100,
    type: 'string',
  } as ValidationRule,

  amount: {
    type: 'number',
    minLength: 1,
  } as ValidationRule,
};

/**
 * Sanitize string input - remove dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>\"']/g, '') // Remove HTML-like chars
    .replace(/[;]/g, '') // Remove semicolons
    .replace(/\0/g, ''); // Remove null bytes
}

/**
 * Validate a single value against a rule
 */
export function validateValue(value: unknown, rule: ValidationRule): boolean {
  // Check required
  if (rule.required && (value === null || value === undefined || value === '')) {
    return false;
  }

  if (value === null || value === undefined) {
    return true; // Passed if not required
  }

  const stringValue = String(value);

  // Check type
  if (rule.type === 'number') {
    if (isNaN(Number(value))) return false;
  }

  // Check length
  if (rule.minLength && stringValue.length < rule.minLength) return false;
  if (rule.maxLength && stringValue.length > rule.maxLength) return false;

  // Check pattern
  if (rule.pattern && !rule.pattern.test(stringValue)) return false;

  // Check allowed values
  if (rule.allowedValues && !rule.allowedValues.includes(stringValue)) return false;

  return true;
}

/**
 * Validate and sanitize object
 */
export function validateAndSanitize(
  data: Record<string, unknown>,
  schema: Record<string, ValidationRule>
): { valid: boolean; data: Record<string, unknown>; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, unknown> = {};

  for (const [key, rule] of Object.entries(schema)) {
    const value = data[key];

    // Validate
    if (!validateValue(value, rule)) {
      errors[key] = `Invalid value for ${key}`;
      continue;
    }

    // Sanitize
    if (rule.sanitize && typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    data: sanitized,
    errors,
  };
}

/**
 * CSRF token validation
 */
const csrfTokenStore = new Map<string, { token: string; expiry: number }>();

export function generateCSRFToken(): string {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  csrfTokenStore.set(token, {
    token,
    expiry: Date.now() + 1 * 60 * 60 * 1000, // 1 hour
  });
  return token;
}

export function validateCSRFToken(token: string): boolean {
  const stored = csrfTokenStore.get(token);
  if (!stored) return false;
  if (Date.now() > stored.expiry) {
    csrfTokenStore.delete(token);
    return false;
  }
  csrfTokenStore.delete(token); // Single-use token
  return true;
}

/**
 * Request body size limit validator
 */
export async function validateBodySize(req: NextRequest, maxSizeKB: number = 1): Promise<boolean> {
  const contentLength = req.headers.get('content-length');
  if (!contentLength) return true;
  return parseInt(contentLength) <= maxSizeKB * 1024;
}

/**
 * Validate request content type
 */
export function validateContentType(
  req: NextRequest,
  allowedTypes: string[]
): boolean {
  const contentType = req.headers.get('content-type');
  if (!contentType) return false;
  return allowedTypes.some((type) => contentType.includes(type));
}

// Export all validation functions as named exports (no default export to avoid ESLint warning)
export const validationUtils = {
  validateValue,
  validateAndSanitize,
  sanitizeString,
  generateCSRFToken,
  validateCSRFToken,
  validateBodySize,
  validateContentType,
};
