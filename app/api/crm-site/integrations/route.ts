// Integrations API for CRM SaaS
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, connectCRMDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { 
  INTEGRATION_LIMITS,
  INTEGRATION_CATALOG,
  Integration
} from '@/lib/crm-site/integrationsConfig';

// GET - List integrations
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('Unauthorized', 401);
    }

    const decoded = await verifyToken(authHeader.substring(7));
    if (!decoded || !decoded.tenantId) {
      return apiError('Invalid token', 401);
    }

    await connectDB();
    const crmDb = await connectCRMDB();
    const collection = crmDb.collection('integrations');

    // Get tenant's integrations
    const integrations = await collection
      .find({ tenantId: decoded.tenantId })
      .toArray();

    // Get plan limits
    const tenantPlan = decoded.plan || 'free';
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

    return apiSuccess({
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
    return apiError('Failed to fetch integrations', 500);
  }
}

// POST - Connect integration
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('Unauthorized', 401);
    }

    const decoded = await verifyToken(authHeader.substring(7));
    if (!decoded || !decoded.tenantId) {
      return apiError('Invalid token', 401);
    }

    const body = await request.json();
    const { provider, credentials, config } = body;

    if (!provider) {
      return apiError('Provider is required', 400);
    }

    // Verify provider exists
    const catalogItem = INTEGRATION_CATALOG.find(i => i.provider === provider);
    if (!catalogItem) {
      return apiError('Invalid integration provider', 400);
    }

    // Check plan limits
    const tenantPlan = decoded.plan || 'free';
    const limits = INTEGRATION_LIMITS[tenantPlan] || INTEGRATION_LIMITS.free;

    if (!limits.allowedProviders.includes(provider)) {
      return apiError(`${catalogItem.name} is not available in your plan. Upgrade to access this integration.`, 403);
    }

    await connectDB();
    const crmDb = await connectCRMDB();
    const collection = crmDb.collection('integrations');

    // Check integration count
    const connectedCount = await collection.countDocuments({ 
      tenantId: decoded.tenantId, 
      isConnected: true 
    });
    
    // Check if this provider is already connected (don't count against limit)
    const existing = await collection.findOne({ 
      tenantId: decoded.tenantId, 
      provider 
    });

    if (!existing && connectedCount >= limits.maxIntegrations) {
      return apiError(`You have reached the maximum of ${limits.maxIntegrations} integrations. Upgrade your plan to add more.`, 403);
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

      return apiSuccess({
        message: `${catalogItem.name} reconnected successfully`,
        id: existing._id.toString(),
      });
    } else {
      // Create new
      const integration: Omit<Integration, 'id'> = {
        tenantId: decoded.tenantId,
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

      return apiSuccess({
        message: `${catalogItem.name} connected successfully`,
        id: result.insertedId.toString(),
      }, 201);
    }
  } catch (error) {
    console.error('Integration POST error:', error);
    return apiError('Failed to connect integration', 500);
  }
}

// PATCH - Update integration
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('Unauthorized', 401);
    }

    const decoded = await verifyToken(authHeader.substring(7));
    if (!decoded || !decoded.tenantId) {
      return apiError('Invalid token', 401);
    }

    const body = await request.json();
    const { id, provider, credentials, config, isActive } = body;

    if (!id && !provider) {
      return apiError('Integration ID or provider is required', 400);
    }

    await connectDB();
    const crmDb = await connectCRMDB();
    const collection = crmDb.collection('integrations');

    const { ObjectId } = await import('mongodb');
    
    const query: any = { tenantId: decoded.tenantId };
    if (id) {
      query._id = new ObjectId(id);
    } else {
      query.provider = provider;
    }

    const existing = await collection.findOne(query);
    if (!existing) {
      return apiError('Integration not found', 404);
    }

    const update: any = { updatedAt: new Date() };
    if (credentials !== undefined) update.credentials = { ...existing.credentials, ...credentials };
    if (config !== undefined) update.config = { ...existing.config, ...config };
    if (isActive !== undefined) update.isActive = isActive;

    await collection.updateOne(query, { $set: update });

    return apiSuccess({ message: 'Integration updated successfully' });
  } catch (error) {
    console.error('Integration PATCH error:', error);
    return apiError('Failed to update integration', 500);
  }
}

// DELETE - Disconnect integration
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('Unauthorized', 401);
    }

    const decoded = await verifyToken(authHeader.substring(7));
    if (!decoded || !decoded.tenantId) {
      return apiError('Invalid token', 401);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const provider = searchParams.get('provider');

    if (!id && !provider) {
      return apiError('Integration ID or provider is required', 400);
    }

    await connectDB();
    const crmDb = await connectCRMDB();
    const collection = crmDb.collection('integrations');

    const { ObjectId } = await import('mongodb');
    
    const query: any = { tenantId: decoded.tenantId };
    if (id) {
      query._id = new ObjectId(id);
    } else {
      query.provider = provider;
    }

    // Soft disconnect - keep config but mark as disconnected
    const result = await collection.updateOne(query, {
      $set: {
        isConnected: false,
        isActive: false,
        updatedAt: new Date(),
      }
    });

    if (result.matchedCount === 0) {
      return apiError('Integration not found', 404);
    }

    return apiSuccess({ message: 'Integration disconnected successfully' });
  } catch (error) {
    console.error('Integration DELETE error:', error);
    return apiError('Failed to disconnect integration', 500);
  }
}
