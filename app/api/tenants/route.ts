/**
 * Tenant Management API Routes (Pure BunnyDB)
 * POST /api/tenants - Create new tenant
 * GET /api/tenants - List tenants (admin only) or get by ?slug=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  listTenants,
  getTenantBySlug,
  createTenant,
} from '@/lib/tenant/bunnyTenantRepository';

export const dynamic = 'force-dynamic';

function tenantError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function tenantSuccess(data: any, message = 'Success', status = 200) {
  return NextResponse.json({ success: true, message, ...data }, { status });
}

// ============================================================================
// POST /api/tenants - Create new tenant (Pure BunnyDB)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantSlug,
      slug,
      organizationName,
      name,
      adminEmail,
      ownerEmail,
      ownerUserId,
      password,
      initialTier = 'free',
      plan = 'free',
    } = body;

    const finalSlug = (tenantSlug || slug || '').trim().toLowerCase();
    const finalName = (organizationName || name || '').trim();
    const finalEmail = (adminEmail || ownerEmail || '').trim().toLowerCase();
    const finalUserId = (ownerUserId || finalEmail).trim().toLowerCase();
    const finalPlan = (plan || initialTier || 'free').toLowerCase();

    // Validation
    if (!finalSlug || !finalName || !finalEmail) {
      return tenantError(
        'Missing required fields: slug, name, and email',
        400
      );
    }

    const newTenant = await createTenant({
      slug: finalSlug,
      name: finalName,
      ownerEmail: finalEmail,
      ownerUserId: finalUserId,
      password: password || 'Welcome@123',
      plan: finalPlan,
    });

    return tenantSuccess(
      {
        tenantId: newTenant._id,
        tenantSlug: newTenant.slug,
        organizationName: newTenant.name,
        subscriptionTier: newTenant.plan,
        subscriptionStatus: newTenant.status,
        adminEmail: newTenant.ownerEmail,
        createdAt: newTenant.createdAt,
      },
      'Tenant created in BunnyDB',
      201
    );
  } catch (error: any) {
    console.error('[POST /api/tenants] Error:', error);
    return tenantError(error.message || 'Failed to create tenant', 400);
  }
}

// ============================================================================
// GET /api/tenants - List all tenants (superadmin) or get by ?slug= (Pure BunnyDB)
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
          const { tenants } = await listTenants({ limit: 100 });
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

    // Otherwise, expect ?slug=xxx in URL
    const slug = request.nextUrl.searchParams.get('slug');
    if (!slug) {
      return tenantError('Provide ?slug=yourtenant', 400);
    }

    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return tenantError('Tenant not found', 404);
    }

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
    console.error('[GET /api/tenants] Error:', error);
    return tenantError(error.message || 'Failed to fetch tenants', 400);
  }
}
