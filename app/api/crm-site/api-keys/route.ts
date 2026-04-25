import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { resolveCrmSiteTenantAccess } from '@/lib/crm-site/tenantAccess';

export const dynamic = 'force-dynamic';

/**
 * GET /api/crm-site/api-keys
 * List all API keys for a tenant
 * 
 * POST /api/crm-site/api-keys
 * Create a new API key
 * 
 * DELETE /api/crm-site/api-keys
 * Revoke an API key
 */

function generateApiKey(): string {
  return `sk_live_${crypto.randomBytes(24).toString('hex')}`;
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: url.searchParams.get('tenant'),
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, tenantSlug } = access;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const apiKeys = await crmDb.collection('tenant_api_keys_v2').find(
      { tenantSlug, revokedAt: { $exists: false } }
    ).toArray();

    // Don't return the actual key hash for security
    const keys = apiKeys.map(k => ({
      id: k._id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      permissions: k.permissions,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      usageCount: k.usageCount || 0,
    }));

    // Get webhook settings
    const webhooks = await crmDb.collection('tenant_webhooks').find(
      { tenantSlug, enabled: true }
    ).toArray();

    return NextResponse.json({ apiKeys: keys, webhooks });
  } catch (err: any) {
    console.error('API Keys GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch API keys' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, decoded, tenant, tenantSlug } = access;
    const { name, permissions = ['read'] } = body;

    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    // Check tenant's plan for API key limits
    const existingKeys = await crmDb.collection('tenant_api_keys_v2').countDocuments({
      tenantSlug,
      revokedAt: { $exists: false },
    });

    const keyLimits: Record<string, number> = {
      free: 1,
      basic: 3,
      starter: 5,
      growth: 10,
      professional: 50,
    };

    const limit = keyLimits[tenant?.plan || 'free'] || 1;
    if (existingKeys >= limit) {
      return NextResponse.json(
        { error: `API key limit reached. Upgrade your plan for more keys (current: ${limit})` },
        { status: 400 }
      );
    }

    // Generate new API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 12) + '...';

    await crmDb.collection('tenant_api_keys_v2').insertOne({
      tenantSlug,
      name,
      keyHash,
      keyPrefix,
      permissions,
      createdBy: (decoded as any).userId || (decoded as any).email,
      createdAt: new Date(),
      usageCount: 0,
    });

    // Return the full key ONCE - it will never be shown again
    return NextResponse.json({
      success: true,
      apiKey, // This is the only time the full key is returned
      keyPrefix,
      name,
      permissions,
      message: 'Save this API key now. It will not be shown again.',
    });
  } catch (err: any) {
    console.error('API Keys POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create API key' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const access = await resolveCrmSiteTenantAccess(request, {
      requestedTenantSlug: body?.tenantSlug,
    });
    if (access instanceof NextResponse) {
      return access;
    }

    const { crmDb, decoded, tenantSlug } = access;
    const { keyId } = body;

    if (!keyId) {
      return NextResponse.json({ error: 'keyId required' }, { status: 400 });
    }

    const mongoose = (await import('mongoose')).default;
    const { ObjectId } = mongoose.Types;

    await crmDb.collection('tenant_api_keys_v2').updateOne(
      { _id: new ObjectId(keyId), tenantSlug },
      { $set: { revokedAt: new Date(), revokedBy: (decoded as any).userId || (decoded as any).email } }
    );

    return NextResponse.json({ success: true, message: 'API key revoked' });
  } catch (err: any) {
    console.error('API Keys DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to revoke API key' }, { status: 500 });
  }
}
