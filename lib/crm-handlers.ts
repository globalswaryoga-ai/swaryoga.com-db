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
 * Escape a user-provided string so it can be safely used in a Mongo $regex.
 * This prevents server 500s caused by invalid regex patterns (e.g. "(", "[a-").
 */
export const escapeRegexLiteral = (input: string): string => {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Verify admin access from request headers
 * Throws error if unauthorized
 */
export const verifyAdminAccess = (request: NextRequest): string => {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  
  if (!decoded?.isAdmin || !decoded?.userId) throw new Error('Unauthorized');
  
  return decoded.userId as string;
};

/**
 * Parse pagination parameters from request URL
 * Returns { limit, skip }
 */
export const parsePagination = (request: NextRequest): { limit: number; skip: number } => {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || 50) || 50, 1000);
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
 * Robust phone number normalization for CRM.
 * Standardizes to digits-only.
 * Handles Indian 10-digit numbers by prepending '91'.
 */
export const normalizePhone = (raw: any): string => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  // Remove leading 0s if it's like 091...
  if (digits.startsWith('0') && digits.length > 10) {
    return digits.replace(/^0+/, '');
  }
  return digits;
};

/**
 * Get the current viewer's user ID from decoded token
 */
export const getViewerUserId = (decoded: any): string => {
  return String(decoded?.userId || decoded?.username || '').trim();
};

/**
 * Check if the current user is a Super Admin (owner of CRM — full access to everything).
 * 
 * Super Admin = Owner of CRM and swaryoga.com.
 * Identified by: userId 'admin' or 'admincrm', role 'superadmin', or permissions ['all'].
 * 
 * Other roles (NOT super admin):
 *   Super Admin Team  = team users under super admin (qrWhatsappEnabled, see assigned leads only)
 *   CRM Admin         = independent tenant who signed up at crm.swaryoga.com
 *   CRM Admin Team    = team users added by a CRM Admin
 *   Leads             = end-users / contacts (not admin users)
 */
export const isSuperAdmin = (decoded: any): boolean => {
  return (
    decoded?.userId === 'admincrm' ||
    decoded?.userId === 'admin' ||
    decoded?.role === 'superadmin' ||
    (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'))
  );
};

/**
 * Check if the current user is a manager (MR Admin)
 * Managers can see data of admin users assigned to them + manage broadcasts/templates
 */
export const isManager = (decoded: any): boolean => {
  return (
    decoded?.role === 'manager' ||
    (Array.isArray(decoded?.permissions) && decoded.permissions.includes('manager'))
  );
};

/**
 * Get list of user IDs that the current user can view data for
 * - Super Admin: returns null (means ALL users)
 * - Manager: returns [self, ...managedUserIds]
 * - Admin: returns [self]
 */
export const getVisibleUserIds = (decoded: any): string[] | null => {
  const viewerUserId = getViewerUserId(decoded);
  
  // Super admin can see ALL data
  if (isSuperAdmin(decoded)) {
    return null; // null means no filter - see all
  }
  
  // Manager can see their own data + data of users they manage
  if (isManager(decoded)) {
    const managedUsers = Array.isArray(decoded?.managedUserIds) 
      ? decoded.managedUserIds.map((u: any) => String(u).trim()).filter(Boolean)
      : [];
    return [viewerUserId, ...managedUsers];
  }
  
  // Regular admin only sees their own data
  return [viewerUserId];
};

/**
 * Build user filter for data access control
 * Returns a MongoDB filter for assignedToUserId/createdByUserId
 */
export const buildUserAccessFilter = (decoded: any, fieldName: string = 'assignedToUserId'): Record<string, any> => {
  const visibleUserIds = getVisibleUserIds(decoded);
  
  // Super admin - no filter
  if (visibleUserIds === null) {
    return {};
  }
  
  // Manager or regular admin - filter by visible users
  if (visibleUserIds.length === 1) {
    return { 
      $or: [
        { [fieldName]: visibleUserIds[0] }, 
        { createdByUserId: visibleUserIds[0] }
      ] 
    };
  }
  
  return { 
    $or: [
      { [fieldName]: { $in: visibleUserIds } }, 
      { createdByUserId: { $in: visibleUserIds } }
    ] 
  };
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
  const status =
    message === 'Unauthorized' || message.includes('Unauthorized')
      ? 401
      : message.includes('Forbidden')
        ? 403
        : message.includes('Invalid')
          ? 400
          : 500;
  
  console.error(`CRM API Error${context ? ` [${context}]` : ''}: ${message}`);
  
  return NextResponse.json(
    { error: message },
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
      ...(meta && { meta })
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

/**
 * Quick tenant isolation filter.
 * - Super admin & manager: returns {}  (see all data)
 * - Regular admin: returns { createdByUserId: viewerId }
 *
 * Use `field` when the ownership column has a different name
 * (e.g. "initiatedBy", "userId", "uploadedBy").
 *
 * Merge into every .find() / .countDocuments() / .aggregate $match.
 */
export const tenantFilter = (
  decoded: any,
  field: string = 'createdByUserId',
): Record<string, any> => {
  if (isSuperAdmin(decoded)) return {};
  const viewerId = getViewerUserId(decoded);
  return viewerId ? { [field]: viewerId } : { [field]: '__never_match__' };
};

/**
 * Same as tenantFilter but checks both assignedToUserId AND createdByUserId.
 * Useful for leads and messages that can be owned OR assigned.
 */
export const tenantOrFilter = (decoded: any): Record<string, any> => {
  if (isSuperAdmin(decoded)) return {};
  const viewerId = getViewerUserId(decoded);
  if (!viewerId) return { createdByUserId: '__never_match__' };
  return {
    $or: [
      { assignedToUserId: viewerId },
      { createdByUserId: viewerId },
    ],
  };
};

/**
 * Verify that the given communityId belongs to the current admin tenant.
 * Community sub-data (posts, members, videos, playlists) is scoped by Community ownership.
 * - SuperAdmin: always allowed
 * - Regular admin: community must have createdByUserId matching the admin, or be legacy (no createdByUserId set)
 * Returns false only when the community clearly belongs to another tenant.
 */
export const verifyCommunityTenant = async (decoded: any, communityId: string): Promise<boolean> => {
  if (isSuperAdmin(decoded)) return true;
  const viewerId = getViewerUserId(decoded);
  if (!viewerId) return false;

  const { getCommunity } = await import('@/lib/db');
  const Community = getCommunity();
  const community = await Community.findOne({
    $or: [{ id: communityId }, { _id: communityId }],
  }).select('createdByUserId').lean() as any;

  if (!community) return false;
  // Legacy communities (no createdByUserId) are accessible by all admins
  if (!community.createdByUserId) return true;
  return community.createdByUserId === viewerId;
};

/**
 * Get the list of communityIds accessible to the current admin.
 * - SuperAdmin: returns null (no restriction)
 * - Regular admin: returns communityIds they own + legacy communities (no createdByUserId)
 */
export const getAccessibleCommunityIds = async (decoded: any): Promise<string[] | null> => {
  if (isSuperAdmin(decoded)) return null;
  const viewerId = getViewerUserId(decoded);
  if (!viewerId) return [];

  const { getCommunity } = await import('@/lib/db');
  const Community = getCommunity();
  const communities = await Community.find({
    $or: [
      { createdByUserId: viewerId },
      { createdByUserId: { $exists: false } },
      { createdByUserId: null },
      { createdByUserId: '' },
    ],
  }).select('id _id').lean() as any[];

  const ids = new Set<string>();
  for (const c of communities) {
    if (c.id) ids.add(c.id);
    if (c._id) ids.add(c._id.toString());
  }
  return Array.from(ids);
};
