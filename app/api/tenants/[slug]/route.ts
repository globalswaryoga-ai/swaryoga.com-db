/**
 * Tenant-Specific API Routes
 * GET /api/tenants/:slug - Get tenant details
 * PUT /api/tenants/:slug - Update tenant subscription/info
 * DELETE /api/tenants/:slug - Delete tenant (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  getTenantBySlug,
  getTenantById,
  upgradePlan,
  revokeAPIKey,
  listAPIKeys,
  setCustomDomain,
  verifyCustomDomain,
  deleteTenant,
} from '@/lib/multiTenant/handlers';
import { buildTenantContext, tenantError, tenantSuccess, withTenantContext } from '@/lib/multiTenant/middleware';
import { verifyToken, isSuperAdmin } from '@/lib/crm-handlers';

// ============================================================================
// GET /api/tenants/:slug - Get tenant details
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    await connectDB();

    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return tenantError('Tenant not found', 404);
    }

    // Check auth: allow if requester is tenant admin or superadmin
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = verifyToken(token);
        const isAdmin =
          isSuperAdmin(decoded) || decoded.userId === (tenant.adminUserId as any)?.toString();

        if (isAdmin) {
          // Return full tenant details for admins
          return NextResponse.json(
            {
              success: true,
              tenant: {
                tenantId: tenant._id,
                tenantSlug: tenant.tenantSlug,
                organizationName: tenant.organizationName,
                subscriptionTier: tenant.subscriptionTier,
                subscriptionStatus: tenant.subscriptionStatus,
                trialEndsAt: tenant.trialEndsAt,
                subscriptionStartDate: tenant.subscriptionStartDate,
                subscriptionEndDate: tenant.subscriptionEndDate,
                billingEmail: tenant.billingEmail,
                customDomain: tenant.customDomain,
                customDomainVerified: tenant.customDomainVerified,
                enabledModules: tenant.enabledModules,
                usage: tenant.usage,
                limits: tenant.limits,
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
          tenantSlug: tenant.tenantSlug,
          organizationName: tenant.organizationName,
          subscriptionTier: tenant.subscriptionTier,
          subscriptionStatus: tenant.subscriptionStatus,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET /api/tenants/:slug] Error:', error);
    return tenantError(error.message || 'Failed to fetch tenant', 400);
  }
}

// ============================================================================
// PUT /api/tenants/:slug - Update tenant subscription/info
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = await request.json();
    const { subscriptionTier, billingEmail, customDomain, verifyDomain } = body;

    await connectDB();

    // Verify admin access
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return tenantError('Authorization required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return tenantError('Tenant not found', 404);
    }

    const isAdmin =
      isSuperAdmin(decoded) || decoded.userId === (tenant.adminUserId as any)?.toString();
    if (!isAdmin) {
      return tenantError('Unauthorized to update this tenant', 403);
    }

    const updates: any = {};
    const { getTenant } = await import('@/lib/multiTenant/schemas');
    const TenantModel = getTenant();

    // Handle subscription tier upgrade
    if (subscriptionTier && subscriptionTier !== tenant.subscriptionTier) {
      const upgraded = await upgradePlan(
        (tenant._id as any).toString(),
        subscriptionTier,
        // paymentMethodId would come from Stripe webhook in real app
        'manual'
      );
      return tenantSuccess({
        message: 'Subscription updated',
        tenant: upgraded,
      });
    }

    // Handle billing email update
    if (billingEmail) {
      updates.billingEmail = billingEmail;
    }

    // Handle custom domain
    if (customDomain) {
      const updated = await setCustomDomain(
        (tenant._id as any).toString(),
        customDomain
      );
      return tenantSuccess({
        message: 'Custom domain set. Please add CNAME record pointing to app.swaryoga.com',
        tenant: updated,
      });
    }

    if (verifyDomain) {
      const verified = await verifyCustomDomain((tenant._id as any).toString());
      return tenantSuccess({
        message: 'Custom domain verified',
        tenant: verified,
      });
    }

    // Apply other updates
    if (Object.keys(updates).length > 0) {
      const updated = await TenantModel.findByIdAndUpdate(
        tenant._id,
        updates,
        { new: true }
      ).lean();

      return tenantSuccess({
        message: 'Tenant updated',
        tenant: updated,
      });
    }

    return tenantError('No updates provided', 400);
  } catch (error: any) {
    console.error('[PUT /api/tenants/:slug] Error:', error);
    return tenantError(error.message || 'Failed to update tenant', 400);
  }
}

// ============================================================================
// DELETE /api/tenants/:slug - Delete tenant (admin only)
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    await connectDB();

    // Verify admin access
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return tenantError('Authorization required', 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!isSuperAdmin(decoded)) {
      return tenantError('Only superadmin can delete tenants', 403);
    }

    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return tenantError('Tenant not found', 404);
    }

    // Soft delete instead of hard delete for audit trail
    const { getTenant } = await import('@/lib/multiTenant/schemas');
    const TenantModel = getTenant();

    await TenantModel.findByIdAndUpdate(tenant._id, {
      isActive: false,
      deletedAt: new Date(),
    });

    return tenantSuccess({
      message: 'Tenant deleted successfully',
    });
  } catch (error: any) {
    console.error('[DELETE /api/tenants/:slug] Error:', error);
    return tenantError(error.message || 'Failed to delete tenant', 400);
  }
}
