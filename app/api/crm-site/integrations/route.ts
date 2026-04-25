// Integrations API for CRM SaaS
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import {
  INTEGRATION_LIMITS,
  INTEGRATION_CATALOG
} from '@/lib/crm-site/integrationsConfig';

export const dynamic = 'force-dynamic';


// GET - List integrations
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenant') || (decoded as any).tenantSlug;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const collection = crmDb.collection('integrations');

    // Get tenant's integrations
    const integrations = await collection
      .find({ tenantSlug })
      .toArray();

    // Get tenant plan
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });
    const tenantPlan = tenant?.plan || 'free';
    const limits = INTEGRATION_LIMITS[tenantPlan] || INTEGRATION_LIMITS.free;

    // Build catalog with status
    const catalog = INTEGRATION_CATALOG.map(item => {
      const connected = integrations.find(i => i.provider === item.provider);
      const isAllowed = limits.allowedProviders.includes(item.provider);
      
      return {
        ...item,
        id: connected?._id?.toString(),
        isConnected: !!connected?.isConnected,
        isActive: connected?.isActive || false,
        lastSync: connected?.lastSync,
        syncError: connected?.syncError,
        isAvailable: isAllowed,
        requiresUpgrade: !isAllowed,
      };
    });

    return NextResponse.json({
      integrations: catalog,
      connected: integrations.filter(i => i.isConnected).length,
      limits: {
        maxIntegrations: limits.maxIntegrations,
        used: integrations.filter(i => i.isConnected).length,
        remaining: limits.maxIntegrations - integrations.filter(i => i.isConnected).length,
        allowedProviders: limits.allowedProviders,
      },
    });
  } catch (error) {
    console.error('Integrations GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
  }
}

// POST - Connect integration
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, credentials, config } = body;
    const tenantSlug = body.tenant || (decoded as any).tenantSlug;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    // Verify provider exists
    const catalogItem = INTEGRATION_CATALOG.find(i => i.provider === provider);
    if (!catalogItem) {
      return NextResponse.json({ error: 'Invalid integration provider' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const collection = crmDb.collection('integrations');

    // Get tenant plan
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });
    const tenantPlan = tenant?.plan || 'free';
    const limits = INTEGRATION_LIMITS[tenantPlan] || INTEGRATION_LIMITS.free;

    if (!limits.allowedProviders.includes(provider)) {
      return NextResponse.json({ error: `${catalogItem.name} is not available in your plan. Upgrade to access this integration.` }, { status: 403 });
    }

    // Check integration count
    const connectedCount = await collection.countDocuments({ 
      tenantSlug, 
      isConnected: true 
    });
    
    // Check if this provider is already connected
    const existing = await collection.findOne({ tenantSlug, provider });

    if (!existing && connectedCount >= limits.maxIntegrations) {
      return NextResponse.json({ error: `You have reached the maximum of ${limits.maxIntegrations} integrations. Upgrade your plan to add more.` }, { status: 403 });
    }

    const now = new Date();

    if (existing) {
      // Update existing
      await collection.updateOne(
        { _id: existing._id },
        {
          $set: {
            credentials: credentials || existing.credentials,
            config: config || existing.config,
            isConnected: true,
            isActive: true,
            syncError: null,
            updatedAt: now,
          }
        }
      );

      return NextResponse.json({
        message: `${catalogItem.name} reconnected successfully`,
        id: existing._id.toString(),
      });
    } else {
      // Create new
      const integration: any = {
        tenantSlug,
        provider,
        name: catalogItem.name,
        description: catalogItem.description,
        icon: catalogItem.icon,
        category: catalogItem.category,
        credentials: credentials || {},
        config: config || {},
        isActive: true,
        isConnected: true,
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(integration);

      return NextResponse.json({
        message: `${catalogItem.name} connected successfully`,
        id: result.insertedId.toString(),
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Integration POST error:', error);
    return NextResponse.json({ error: 'Failed to connect integration' }, { status: 500 });
  }
}

// PATCH - Update integration
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { id, provider, credentials, config, isActive } = body;
    const tenantSlug = body.tenant || (decoded as any).tenantSlug;

    if (!id && !provider) {
      return NextResponse.json({ error: 'Integration ID or provider is required' }, { status: 400 });
    }

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const collection = crmDb.collection('integrations');

    const { ObjectId } = await import('mongodb');
    
    const query: any = { tenantSlug };
    if (id) {
      query._id = new ObjectId(id);
    } else {
      query.provider = provider;
    }

    const existing = await collection.findOne(query);
    if (!existing) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    const update: any = { updatedAt: new Date() };
    if (credentials !== undefined) update.credentials = { ...existing.credentials, ...credentials };
    if (config !== undefined) update.config = { ...existing.config, ...config };
    if (isActive !== undefined) update.isActive = isActive;

    await collection.updateOne(query, { $set: update });

    return NextResponse.json({ message: 'Integration updated successfully' });
  } catch (error) {
    console.error('Integration PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 });
  }
}

// DELETE - Disconnect integration
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const provider = searchParams.get('provider');
    const tenantSlug = searchParams.get('tenant') || (decoded as any).tenantSlug;

    if (!id && !provider) {
      return NextResponse.json({ error: 'Integration ID or provider is required' }, { status: 400 });
    }

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    await connectDB();
    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const collection = crmDb.collection('integrations');

    const { ObjectId } = await import('mongodb');
    
    const query: any = { tenantSlug };
    if (id) {
      query._id = new ObjectId(id);
    } else {
      query.provider = provider;
    }

    // Soft disconnect
    const result = await collection.updateOne(query, {
      $set: {
        isConnected: false,
        isActive: false,
        updatedAt: new Date(),
      }
    });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Integration disconnected successfully' });
  } catch (error) {
    console.error('Integration DELETE error:', error);
    return NextResponse.json({ error: 'Failed to disconnect integration' }, { status: 500 });
  }
}
