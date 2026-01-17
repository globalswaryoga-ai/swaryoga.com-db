/**
 * Security Headers Configuration for Next.js
 * Implements OWASP recommended security headers
 */

export const securityHeaders = [
  // Prevent clickjacking attacks
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Enable XSS protection (legacy, but still useful)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Referrer Policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Feature Policy / Permissions Policy
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), usb=()',
  },
  // HSTS - Forces HTTPS
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' cdn.cashfree.com checkout.cashfree.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss: http://localhost:3333", // Include bridge for dev
      "frame-src 'self' checkout.cashfree.com", // Cashfree checkout frame
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

// CORS configuration
export const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://swaryoga.com', 'https://www.swaryoga.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'RateLimit-Limit', 'RateLimit-Remaining'],
  maxAge: 86400, // 24 hours
};

// Input validation rules
export const inputValidationRules = {
  // Phone number validation (India format)
  phone: /^([+]?91)?[6-9]\d{9}$/,
  
  // Email validation
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // URL validation
  url: /^https?:\/\/.+/,
  
  // Safe string (no special chars that could cause injection)
  safeString: /^[a-zA-Z0-9\s\-_.@]*$/,
  
  // Numeric validation
  numeric: /^\d+$/,
  
  // Amount validation (max 999999.99)
  amount: /^\d+(\.\d{1,2})?$/,
};

export function validateInput(
  input: unknown,
  rule: keyof typeof inputValidationRules | RegExp
): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  const pattern = typeof rule === 'string' ? inputValidationRules[rule] : rule;
  return pattern.test(input);
}

// SQL Injection prevention - sanitize strings
export function sanitizeInput(input: string): string {
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\\/g, '\\\\') // Escape backslashes
    .trim();
}

// XSS prevention - encode HTML
export function encodeHTML(str: string): string {
  const htmlEscapeMap: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char]);
}

// File upload security
export const fileUploadLimits = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
};

export function validateFileUpload(
  file: { mimetype: string; size: number; originalname: string }
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > fileUploadLimits.maxFileSize) {
    return { valid: false, error: 'File too large' };
  }

  // Check MIME type
  if (!fileUploadLimits.allowedMimeTypes.includes(file.mimetype)) {
    return { valid: false, error: 'Invalid file type' };
  }

  // Check extension
  const ext = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
  if (!fileUploadLimits.allowedExtensions.includes(ext)) {
    return { valid: false, error: 'Invalid file extension' };
  }

  return { valid: true };
}

// Password requirements
export const passwordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < passwordRequirements.minLength) {
    errors.push(`At least ${passwordRequirements.minLength} characters`);
  }

  if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter');
  }

  if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter');
  }

  if (passwordRequirements.requireNumbers && !/\d/.test(password)) {
    errors.push('At least one number');
  }

  if (
    passwordRequirements.requireSpecialChars &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push('At least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
