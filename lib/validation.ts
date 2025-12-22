/**
 * Comprehensive input validation and sanitization utilities
 * Prevents SQL injection, XSS, and other common attacks
 */

import { Types } from 'mongoose';

// Validation error details
export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates MongoDB ObjectId
 */
export const validateObjectId = (id: unknown): id is string => {
  if (typeof id !== 'string') return false;
  return Types.ObjectId.isValid(id);
};

/**
 * Validates email format
 */
export const validateEmail = (email: unknown): email is string => {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validates phone number format (international)
 */
export const validatePhoneNumber = (phone: unknown): phone is string => {
  if (typeof phone !== 'string') return false;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validates string length
 */
export const validateStringLength = (
  str: unknown,
  minLength: number = 0,
  maxLength: number = 10000
): str is string => {
  if (typeof str !== 'string') return false;
  return str.length >= minLength && str.length <= maxLength;
};

/**
 * Sanitizes string input (prevents XSS)
 */
export const sanitizeString = (input: unknown): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
};

/**
 * Sanitizes HTML while preserving safe formatting
 */
export const sanitizeHtml = (input: unknown): string => {
  if (typeof input !== 'string') return '';
  
  // Remove script tags and dangerous attributes
  const dangerous = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|on\w+\s*=\s*["'][^"']*["']/gi;
  return input.replace(dangerous, '');
};

/**
 * Validates positive number
 */
export const validatePositiveNumber = (num: unknown): num is number => {
  return typeof num === 'number' && num > 0 && Number.isFinite(num);
};

/**
 * Validates numeric string (for currency, IDs, etc.)
 */
export const validateNumericString = (str: unknown): str is string => {
  if (typeof str !== 'string') return false;
  return /^\d+$/.test(str);
};

/**
 * Validates URL format
 */
export const validateUrl = (url: unknown): url is string => {
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates date string (ISO 8601)
 */
export const validateDateString = (date: unknown): date is string => {
  if (typeof date !== 'string') return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
};

/**
 * Validates enum value
 */
export const validateEnum = <T>(value: unknown, enumValues: T[]): value is T => {
  return enumValues.includes(value as T);
};

/**
 * Validates object structure
 */
export const validateObjectStructure = (
  obj: unknown,
  schema: Record<string, (val: unknown) => boolean>
): obj is Record<string, unknown> => {
  if (typeof obj !== 'object' || obj === null) return false;
  
  for (const [key, validator] of Object.entries(schema)) {
    if (!(key in obj)) return false;
    if (!validator((obj as Record<string, unknown>)[key])) return false;
  }
  
  return true;
};

/**
 * Comprehensive field validation
 */
export const validateField = (
  field: string,
  value: unknown,
  rules: {
    type?: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: unknown[];
    custom?: (val: unknown) => boolean;
  }
): ValidationError | null => {
  const errors: string[] = [];
  
  // Check required
  if (rules.required && (value === null || value === undefined || value === '')) {
    return { field, message: 'This field is required', value };
  }
  
  if (value === null || value === undefined) return null;
  
  // Check type
  if (rules.type && typeof value !== rules.type) {
    return { field, message: `Expected ${rules.type}, got ${typeof value}`, value };
  }
  
  // Check string length
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Minimum length is ${rules.minLength}`);
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Maximum length is ${rules.maxLength}`);
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push('Invalid format');
    }
  }
  
  // Check enum
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push(`Must be one of: ${rules.enum.join(', ')}`);
  }
  
  // Custom validation
  if (rules.custom && !rules.custom(value)) {
    errors.push('Failed custom validation');
  }
  
  return errors.length > 0 ? { field, message: errors.join('; '), value } : null;
};

/**
 * Validate multiple fields
 */
export const validateFields = (
  data: Record<string, unknown>,
  rules: Record<string, Parameters<typeof validateField>[2]>
): ValidationResult => {
  const errors: ValidationError[] = [];
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    const error = validateField(field, data[field], fieldRules);
    if (error) errors.push(error);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitizes object recursively
 */
export const sanitizeObject = <T extends Record<string, unknown>>(
  obj: T,
  allowedKeys?: string[]
): T => {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip internal fields
    if (key.startsWith('$') || key.startsWith('_')) continue;
    
    // Check allowed keys
    if (allowedKeys && !allowedKeys.includes(key)) continue;
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, allowedKeys);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
};

/**
 * Extracts allowed fields from object
 */
export const extractAllowedFields = <T extends Record<string, unknown>>(
  obj: T,
  allowedKeys: string[]
): Partial<T> => {
  const extracted: Record<string, unknown> = {};
  
  for (const key of allowedKeys) {
    if (key in obj) {
      extracted[key] = obj[key];
    }
  }
  
  return extracted as Partial<T>;
};

/**
 * SQL Injection prevention: escapes dangerous characters
 */
export const escapeSqlString = (input: string): string => {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/"/g, '\\"')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
};

/**
 * CSRF token validation utility
 */
export const generateCsrfToken = (): string => {
  return require('crypto').randomBytes(32).toString('hex');
};

export const validateCsrfToken = (provided: string, stored: string): boolean => {
  return provided === stored;
};
