/**
 * Tenant Management API Routes
 * POST /api/tenants - Create new tenant
 * GET /api/tenants - List tenants (admin only)
 * GET /api/tenants/:slug - Get tenant details
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  createTenant as createTenantHandler,
  generateAPIKey,
  getTenantBySlug,
  getTenantById,
} from '@/lib/multiTenant/handlers';
import { buildTenantContext, tenantError, tenantSuccess } from '@/lib/multiTenant/middleware';
import { verifyToken, isSuperAdmin } from '@/lib/crm-handlers';

// ============================================================================
// POST /api/tenants - Create new tenant (public, or superadmin only)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      tenantSlug,
      organizationName,
      adminEmail,
      billingEmail,
      initialTier = 'free',
      authToken, // Optional: if coming from logged-in user
    } = body;

    // Validation
    if (!tenantSlug || !organizationName || !adminEmail) {
      return tenantError(
        'Missing required fields: tenantSlug, organizationName, adminEmail',
        400
      );
    }

    let adminUserId = 'anonymous'; // Default for new registrations
    let adminName = organizationName.split(' ')[0]; // Use org name as fallback

    // If auth token provided, use logged-in user
    if (authToken) {
      try {
        const decoded = verifyToken(authToken);
        adminUserId = decoded.userId;
        adminName = decoded.userName || 'Admin';
      } catch (e) {
        // Ignore invalid token, allow anonymous signup
      }
    }

    // Create tenant
    const newTenant = await createTenantHandler({
      tenantSlug,
      organizationName,
      adminUserId,
      adminName,
      adminEmail,
      billingEmail: billingEmail || adminEmail,
      initialTier,
    });

    // Generate initial API key for this tenant
    const apiKeyResult = await generateAPIKey(
      newTenant._id.toString(),
      newTenant.tenantSlug,
      'Default API Key'
    );

    return tenantSuccess(
      {
        tenantId: newTenant._id,
        tenantSlug: newTenant.tenantSlug,
        organizationName: newTenant.organizationName,
        subscriptionTier: newTenant.subscriptionTier,
        subscriptionStatus: newTenant.subscriptionStatus,
        adminEmail: newTenant.adminEmail,
        createdAt: newTenant.createdAt,
        // Return API key only once
        apiKey: apiKeyResult.plainKey,
        apiKeyNote: 'Save this API key securely. You cannot view it again.',
      },
      201
    );
  } catch (error: any) {
    console.error('[POST /api/tenants] Error:', error);
    return tenantError(error.message || 'Failed to create tenant', 400);
  }
}

// ============================================================================
// GET /api/tenants - List all tenants (superadmin only)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Check if this is admin list request
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = verifyToken(token);
        if (isSuperAdmin(decoded)) {
          // Superadmin listing all tenants
          await connectDB();
          const { getTenant } = await import('@/lib/multiTenant/schemas');
          const TenantModel = getTenant();

          const tenants = await TenantModel.find({ isActive: true })
            .select('-usage') // Exclude detailed usage for list view
            .lean();

          return NextResponse.json(
            {
              success: true,
              count: tenants.length,
              tenants,
            },
            { status: 200 }
          );
        }
      } catch (e) {
        // Not a valid token, fall through to slug lookup
      }
    }

    // Otherwise, expect ?slug=xxx or :slug in URL
    const slug = request.nextUrl.searchParams.get('slug');
    if (!slug) {
      return tenantError(
        'Provide ?slug=yourtenant or use x-tenant-slug header',
        400
      );
    }

    // Look up tenant by slug (public info only)
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return tenantError('Tenant not found', 404);
    }

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
    console.error('[GET /api/tenants] Error:', error);
    return tenantError(error.message || 'Failed to fetch tenants', 400);
  }
}
