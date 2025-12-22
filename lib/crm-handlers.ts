/**
 * CRM API Handler Utilities
 * Extracted common logic from CRM routes for reusability and reduced complexity
 * 
 * This module provides:
 * - Admin authentication verification
 * - Common query parameter parsing
 * - Standard pagination handling
 * - Error response formatting
 * - Filter building utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';
import mongoose from 'mongoose';

/**
 * Verify admin access from request headers
 * Throws error if unauthorized
 */
export const verifyAdminAccess = (request: NextRequest): string => {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  
  if (!decoded?.isAdmin || !decoded?.userId) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  return decoded.userId as string;
};

/**
 * Parse pagination parameters from request URL
 * Returns { limit, skip }
 */
export const parsePagination = (request: NextRequest): { limit: number; skip: number } => {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || 50) || 50, 200);
  const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);
  
  return { limit, skip };
};

/**
 * Parse date range filter from request URL
 * Returns { $gte?, $lte? }
 */
export const parseDateRange = (request: NextRequest): Record<string, Date> | undefined => {
  const url = new URL(request.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  
  if (!startDate && !endDate) return undefined;
  
  const dateFilter: any = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);
  
  return Object.keys(dateFilter).length > 0 ? dateFilter : undefined;
};

/**
 * Validate MongoDB ObjectId
 */
export const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Convert string ID to MongoDB ObjectId
 */
export const toObjectId = (id: string): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(id);
};

/**
 * Build MongoDB filter from string parameters
 */
export const buildFilter = (
  parameters: Record<string, string | null | undefined>,
  fieldMappings?: Record<string, string>
): Record<string, any> => {
  const filter: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(parameters)) {
    if (!value) continue;
    
    const fieldName = fieldMappings?.[key] || key;
    
    // Handle ObjectId fields
    if (fieldName.includes('Id') && isValidObjectId(value)) {
      filter[fieldName] = toObjectId(value);
    } else {
      filter[fieldName] = value;
    }
  }
  
  return filter;;
};

/**
 * Handle CRM API errors with consistent response format
 */
export const handleCrmError = (error: unknown, context?: string): NextResponse => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const status = message.includes('Unauthorized') ? 401 : message.includes('Invalid') ? 400 : 500;
  
  console.error(`CRM API Error${context ? ` [${context}]` : ''}: ${message}`);
  
  return NextResponse.json(
    { 
      error: message,
      success: false,
      timestamp: new Date().toISOString()
    },
    { status }
  );
};

/**
 * Format successful CRM API response
 */
export const formatCrmSuccess = (data: any, meta?: Record<string, any>): NextResponse => {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta && { meta }),
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
};

/**
 * Validate required query parameters
 */
export const validateRequiredParams = (
  params: Record<string, string | undefined>,
  required: string[]
): string | null => {
  for (const param of required) {
    if (!params[param]) {
      return `Missing required parameter: ${param}`;
    }
  }
  return null;
};

/**
 * Parse filters with type coercion
 */
export const parseFilters = (url: URL, filterDefinitions: Record<string, 'string' | 'boolean' | 'date' | 'id'>): Record<string, any> => {
  const filters: Record<string, any> = {};
  
  for (const [key, type] of Object.entries(filterDefinitions)) {
    const value = url.searchParams.get(key);
    if (!value) continue;
    
    switch (type) {
      case 'boolean':
        filters[key] = value === 'true' || value === '1';
        break;
      case 'date':
        filters[key] = new Date(value);
        break;
      case 'id':
        if (isValidObjectId(value as string)) {
          filters[key] = toObjectId(value as string);
        }
        break;
      case 'string':
      default:
        filters[key] = value;
    }
  }
  
  return filters;
};

/**
 * Build response metadata (counts, pagination info)
 */
export const buildMetadata = (
  total: number,
  limit: number,
  skip: number,
  additional?: Record<string, any>
) => {
  return {
    total,
    limit,
    skip,
    page: Math.floor(skip / limit) + 1,
    pages: Math.ceil(total / limit),
    hasMore: skip + limit < total,
    ...additional
  };
};
