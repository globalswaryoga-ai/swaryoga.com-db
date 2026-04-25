import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getAutoConfig } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/integration-hub
 * Fetch integration hub settings for the logged-in user
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const ownerId = getViewerUserId(decoded);
    // Store integration settings per user using a unique key
    const AutoConfig = getAutoConfig();
    const config = await AutoConfig.findOne({ key: `integration_hub_${ownerId}` }).lean();

    return NextResponse.json({
      success: true,
      settings: config?.metadata || null,
    });
  } catch (error) {
    console.error('[IntegrationHub API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/crm/integration-hub
 * Save integration hub settings (upsert)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(authHeader || '');

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    await connectDB();

    const ownerId = getViewerUserId(decoded);
    const AutoConfig = getAutoConfig();

    await AutoConfig.findOneAndUpdate(
      { key: `integration_hub_${ownerId}` },
      {
        $set: {
          key: `integration_hub_${ownerId}`,
          metadata: body,
          updatedBy: decoded.userId || 'admin',
        },
      },
      { upsert: true, new: true }
    );

    console.log('[IntegrationHub API] Saved for ownerId:', ownerId);

    return NextResponse.json({
      success: true,
      message: 'Integration settings saved successfully',
    });
  } catch (error) {
    console.error('[IntegrationHub API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save settings' },
      { status: 500 }
    );
  }
}
