/**
 * Comprehensive error handling and standardization
 * Provides consistent error responses across all API routes
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// Optional Sentry integration - install @sentry/nextjs if needed
let Sentry: any = null;
try {
  // Dynamic import for optional dependency
  // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
  Sentry = require('@sentry/nextjs');
} catch (e) {
  // Sentry not installed - optional dependency
}

/**
 * Standard error codes
 */
export enum ErrorCode {
  // Client errors
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Server errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    timestamp: string;
    traceId?: string;
  };
}

/**
 * Success response format
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

/**
 * Maps HTTP status codes to error codes
 */
const ERROR_CODE_TO_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.VALIDATION_ERROR]: 422,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_API_ERROR]: 502,
};

/**
 * Generate trace ID for error tracking
 */
const generateTraceId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create standardized error response
 */
export const createErrorResponse = (
  code: ErrorCode,
  message: string,
  details?: unknown,
  traceId?: string
): ErrorResponse => {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      traceId: traceId || generateTraceId(),
    },
  };
};

/**
 * Create standardized success response
 */
export const createSuccessResponse = <T = unknown>(
  data: T,
  meta?: SuccessResponse<T>['meta']
): SuccessResponse<T> => {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(meta && { meta }),
  };
};

/**
 * Return error as NextResponse
 */
export const returnError = (
  code: ErrorCode,
  message: string,
  details?: unknown
): NextResponse => {
  const traceId = generateTraceId();
  const response = createErrorResponse(code, message, details, traceId);
  const status = ERROR_CODE_TO_STATUS[code];
  
  // Log to Sentry in production
  if (process.env.NODE_ENV === 'production' && Sentry) {
    try {
      Sentry.captureException(new Error(message), {
        tags: { errorCode: code, traceId },
        extra: { details },
      });
    } catch (err) {
      console.error('Sentry logging failed:', err);
    }
  }
  
  return NextResponse.json(response, { status });
};

/**
 * Return success as NextResponse
 */
export const returnSuccess = <T = unknown>(
  data: T,
  meta?: SuccessResponse<T>['meta'],
  status: number = 200
): NextResponse => {
  const response = createSuccessResponse(data, meta);
  return NextResponse.json(response, { status });
};

/**
 * Handle async route execution with error catching
 */
export const asyncHandler = (
  handler: (req: Request) => Promise<NextResponse>
) => {
  return async (req: Request): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      const traceId = generateTraceId();
      
      if (error instanceof Error) {
        console.error(`[${traceId}] Error:`, error.message, error.stack);
        
        // Handle specific error types
        if (error.message.includes('Not found')) {
          return returnError(ErrorCode.NOT_FOUND, error.message);
        }
        if (error.message.includes('Unauthorized')) {
          return returnError(ErrorCode.UNAUTHORIZED, error.message);
        }
        if (error.message.includes('Validation')) {
          return returnError(ErrorCode.VALIDATION_ERROR, error.message);
        }
        
        // Log to Sentry
        if (process.env.NODE_ENV === 'production' && Sentry) {
          try {
            Sentry.captureException(error, { tags: { traceId } });
          } catch (err) {
            console.error('Sentry logging failed:', err);
          }
        }
      }
      
      return returnError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'An unexpected error occurred'
      );
    }
  };
};

/**
 * Validation error helper
 */
export const returnValidationError = (
  errors: Array<{ field: string; message: string }>
): NextResponse => {
  return returnError(
    ErrorCode.VALIDATION_ERROR,
    'Validation failed',
    { errors }
  );
};

/**
 * Database error handler
 */
export const handleDatabaseError = (error: unknown): NextResponse => {
  if (error instanceof Error) {
    console.error('Database error:', error.message);
    
    if (error.message.includes('E11000')) {
      return returnError(
        ErrorCode.CONFLICT,
        'This record already exists'
      );
    }
  }
  
  return returnError(
    ErrorCode.DATABASE_ERROR,
    'Database operation failed'
  );
};

/**
 * External API error handler
 */
export const handleExternalApiError = (
  error: unknown,
  serviceName: string
): NextResponse => {
  if (error instanceof Error) {
    console.error(`${serviceName} API error:`, error.message);
  }
  
  return returnError(
    ErrorCode.EXTERNAL_API_ERROR,
    `Failed to communicate with ${serviceName}`
  );
};

/**
 * Auth error handler
 */
export const returnAuthError = (message: string = 'Authentication required'): NextResponse => {
  return returnError(ErrorCode.UNAUTHORIZED, message);
};

/**
 * Permission error handler
 */
export const returnPermissionError = (message: string = 'Access denied'): NextResponse => {
  return returnError(ErrorCode.FORBIDDEN, message);
};

/**
 * Rate limit error handler
 */
export const returnRateLimitError = (retryAfter?: number): NextResponse => {
  const response = returnError(
    ErrorCode.RATE_LIMITED,
    'Too many requests. Please try again later.'
  );
  
  if (retryAfter) {
    response.headers.set('Retry-After', String(retryAfter));
  }
  
  return response;
};

/**
 * Not found error handler
 */
export const returnNotFoundError = (resource: string = 'Resource'): NextResponse => {
  return returnError(ErrorCode.NOT_FOUND, `${resource} not found`);
};
