/**
 * Comprehensive security middleware for Next.js API routes
 * Includes CORS, rate limiting, request validation, and security headers
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
} as const;

/**
 * CORS configuration
 */
export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
  credentials: boolean;
}

export const DEFAULT_CORS_CONFIG: CorsConfig = {
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://swaryoga.com',
    'https://www.swaryoga.com',
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400,
  credentials: true,
};

/**
 * Applies security headers to response
 */
export const applySecurityHeaders = (response: NextResponse): NextResponse => {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
};

/**
 * CORS middleware
 */
export const handleCors = (
  request: NextRequest,
  config: CorsConfig = DEFAULT_CORS_CONFIG
): NextResponse | null => {
  const origin = request.headers.get('origin');
  
  // Preflight request
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    
    if (origin && config.allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', String(config.credentials));
      response.headers.set('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
      response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
      response.headers.set('Access-Control-Max-Age', String(config.maxAge));
    }
    
    return response;
  }
  
  return null;
};

/**
 * Request validation middleware
 */
export interface RequestValidationConfig {
  requireAuth?: boolean;
  requireBody?: boolean;
  maxBodySize?: number; // in bytes
  allowedMethods?: string[];
  allowedContentTypes?: string[];
}

export const validateRequest = async (
  request: NextRequest,
  config: RequestValidationConfig = {}
): Promise<{ valid: boolean; error?: string }> => {
  // Check method
  if (config.allowedMethods && !config.allowedMethods.includes(request.method)) {
    return { valid: false, error: `Method ${request.method} not allowed` };
  }
  
  // Check content type for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    
    if (config.requireBody && !contentType) {
      return { valid: false, error: 'Content-Type header is required' };
    }
    
    if (config.allowedContentTypes && contentType) {
      const isAllowed = config.allowedContentTypes.some(type =>
        contentType.includes(type)
      );
      if (!isAllowed) {
        return { valid: false, error: 'Invalid Content-Type' };
      }
    }
    
    // Check body size
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const maxSize = config.maxBodySize || 1024 * 1024; // 1MB default
      if (parseInt(contentLength) > maxSize) {
        return { valid: false, error: 'Request body too large' };
      }
    }
  }
  
  return { valid: true };
};

/**
 * Rate limiting with sliding window
 */
export interface RateLimitConfig {
  windowMs: number; // milliseconds
  maxRequests: number;
  keyPrefix?: string;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (
  key: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }
): { allowed: boolean; retryAfter?: number } => {
  const prefixedKey = `${config.keyPrefix || 'rl'}:${key}`;
  const now = Date.now();
  
  const current = rateLimitStore.get(prefixedKey);
  
  // Check if entry exists and is still valid
  if (current && current.resetTime > now) {
    if (current.count >= config.maxRequests) {
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }
    
    current.count++;
    return { allowed: true };
  }
  
  // Create new entry or reset existing
  rateLimitStore.set(prefixedKey, {
    count: 1,
    resetTime: now + config.windowMs,
  });
  
  return { allowed: true };
};

/**
 * Cleanup old rate limit entries (call periodically)
 */
export const cleanupRateLimitStore = (): void => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((value, key) => {
    if (value.resetTime <= now) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
};

/**
 * Get client IP address from request
 */
export const getClientIp = (request: NextRequest): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return request.headers.get('x-real-ip') || 'unknown';
};

/**
 * Comprehensive security middleware
 */
export const securityMiddleware = async (
  request: NextRequest,
  config: {
    cors?: CorsConfig;
    validation?: RequestValidationConfig;
    rateLimit?: RateLimitConfig;
    skipRateLimit?: boolean;
  } = {}
): Promise<{ response?: NextResponse; error?: string }> => {
  // Handle CORS
  const corsResponse = handleCors(request, config.cors);
  if (corsResponse) {
    return { response: applySecurityHeaders(corsResponse) };
  }
  
  // Validate request
  const validation = await validateRequest(request, config.validation);
  if (!validation.valid) {
    return {
      error: validation.error,
    };
  }
  
  // Check rate limit
  if (!config.skipRateLimit && config.rateLimit) {
    const clientIp = getClientIp(request);
    const limit = checkRateLimit(clientIp, config.rateLimit);
    
    if (!limit.allowed) {
      const response = NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
      response.headers.set('Retry-After', String(limit.retryAfter));
      return { response: applySecurityHeaders(response) };
    }
  }
  
  return {};
};

/**
 * Middleware helper to wrap API routes
 */
export const withSecurityMiddleware = (
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: Parameters<typeof securityMiddleware>[1] = {}
) => {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { response, error } = await securityMiddleware(request, config);
    
    if (response) return response;
    if (error) {
      return applySecurityHeaders(
        NextResponse.json({ error }, { status: 400 })
      );
    }
    
    return applySecurityHeaders(await handler(request));
  };
};

/**
 * Environment variable security check
 */
export const validateSecurityEnv = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const required = ['JWT_SECRET', 'MONGODB_URI'];
  
  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }
  
  // Check JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};
