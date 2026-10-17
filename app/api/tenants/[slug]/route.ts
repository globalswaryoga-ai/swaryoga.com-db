/**
 * Tenant-Specific API Routes (Pure BunnyDB)
 * GET /api/tenants/:slug - Get tenant details
 * PUT /api/tenants/:slug - Update tenant subscription/info
 * DELETE /api/tenants/:slug - Delete tenant (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  getTenantBySlug,
  updateTenant,
  deleteTenant,
} from '@/lib/tenant/bunnyTenantRepository';

export const dynamic = 'force-dynamic';

function tenantError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return tenantError('Tenant not found', 404);
    }

    // Check auth
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = verifyToken(token);
        const isAdmin =
          isSuperAdmin(decoded) || decoded?.userId === tenant.ownerUserId || decoded?.email === tenant.ownerEmail;

        if (isAdmin) {
          return NextResponse.json(
            {
              success: true,
              tenant: {
                tenantId: tenant._id,
                tenantSlug: tenant.slug,
                organizationName: tenant.name,
                subscriptionTier: tenant.plan,
                subscriptionStatus: tenant.status,
                billingEmail: tenant.ownerEmail,
                customDomain: tenant.customDomain,
                customDomainVerified: tenant.customDomainVerified,
                enabledModules: tenant.enabledModules,
                pricing: tenant.pricing,
                customLimits: tenant.customLimits,
                createdAt: tenant.createdAt,
              },
            },
            { status: 200 }
          );
        }
      } catch (e) {
        // Invalid token
      }
    }

    // Non-authenticated users get basic info only
    return NextResponse.json(
      {
        success: true,
        tenant: {
          tenantSlug: tenant.slug,
          organizationName: tenant.name,
          subscriptionTier: tenant.plan,
          subscriptionStatus: tenant.status,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET /api/tenants/:slug] Error:', error);
    return tenantError(error.message || 'Failed to fetch tenant', 400);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return tenantError('Unauthorized', 401);
    }

    const decoded = verifyToken(authHeader.substring(7));
    if (!decoded || !isSuperAdmin(decoded)) {
      return tenantError('Super admin required', 403);
    }

    const body = await request.json();
    const updated = await updateTenant(slug, body);

    return NextResponse.json({
      success: true,
      tenant: updated,
      message: 'Tenant updated in BunnyDB',
    });
  } catch (error: any) {
    console.error('[PUT /api/tenants/:slug] Error:', error);
    return tenantError(error.message || 'Failed to update tenant', 400);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return tenantError('Unauthorized', 401);
    }

    const decoded = verifyToken(authHeader.substring(7));
    if (!decoded || !isSuperAdmin(decoded)) {
      return tenantError('Super admin required', 403);
    }

    const res = await deleteTenant(slug);
    return NextResponse.json({
      success: true,
      ...res,
      message: `Tenant "${slug}" deleted from BunnyDB`,
    });
  } catch (error: any) {
    console.error('[DELETE /api/tenants/:slug] Error:', error);
    return tenantError(error.message || 'Failed to delete tenant', 400);
  }
}
