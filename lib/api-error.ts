/**
 * @fileoverview Standardized API Error Response Utility
 * @author Swar Yoga Team
 * @copyright 2025 Global Swar Yoga AI - All Rights Reserved
 * @protected This code is protected under intellectual property laws
 */

import { NextResponse } from 'next/server';

export type ApiErrorCode = 
  | 'UNAUTHORIZED' 
  | 'FORBIDDEN' 
  | 'NOT_FOUND' 
  | 'VALIDATION_ERROR' 
  | 'DATABASE_ERROR' 
  | 'SERVER_ERROR' 
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_REQUEST'
  | 'AUTHENTICATION_FAILED'
  | 'SERVICE_UNAVAILABLE';

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: ApiErrorCode;
  details?: string;
  timestamp?: string;
}

interface ErrorConfig {
  message: string;
  code: ApiErrorCode;
  status: number;
  details?: string;
}

const errorMap: Record<ApiErrorCode, Omit<ErrorConfig, 'details'>> = {
  UNAUTHORIZED: {
    message: 'Unauthorized - Please login',
    code: 'UNAUTHORIZED',
    status: 401,
  },
  FORBIDDEN: {
    message: 'Forbidden - Access denied',
    code: 'FORBIDDEN',
    status: 403,
  },
  NOT_FOUND: {
    message: 'Resource not found',
    code: 'NOT_FOUND',
    status: 404,
  },
  VALIDATION_ERROR: {
    message: 'Invalid request data',
    code: 'VALIDATION_ERROR',
    status: 400,
  },
  DATABASE_ERROR: {
    message: 'Database operation failed',
    code: 'DATABASE_ERROR',
    status: 503,
  },
  SERVER_ERROR: {
    message: 'Internal server error',
    code: 'SERVER_ERROR',
    status: 500,
  },
  RATE_LIMIT_EXCEEDED: {
    message: 'Too many requests - Please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
    status: 429,
  },
  INVALID_REQUEST: {
    message: 'Invalid request format',
    code: 'INVALID_REQUEST',
    status: 400,
  },
  AUTHENTICATION_FAILED: {
    message: 'Authentication failed',
    code: 'AUTHENTICATION_FAILED',
    status: 401,
  },
  SERVICE_UNAVAILABLE: {
    message: 'Service temporarily unavailable',
    code: 'SERVICE_UNAVAILABLE',
    status: 503,
  },
};

/**
 * Create standardized error response
 */
export function apiError(
  code: ApiErrorCode,
  customMessage?: string,
  details?: string
) {
  const config = errorMap[code];
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: customMessage || config.message,
    code,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    errorResponse.details = details;
  }

  return NextResponse.json(errorResponse, { status: config.status });
}

/**
 * Create standardized success response
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Log error with context
 */
export function logError(
  context: string,
  error: any,
  additionalInfo?: Record<string, any>
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`[${context}] Error:`, {
    message: errorMessage,
    stack: errorStack,
    ...additionalInfo,
  });
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: any,
  fields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = fields.filter(f => !data[f]);
  return {
    valid: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined,
  };
}
