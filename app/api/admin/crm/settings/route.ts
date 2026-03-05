import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';

// GET /api/admin/crm/settings - Load current user's CRM settings
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const decoded = await verifyToken(req);
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    const CRMUserSettings = getCRMUserSettings();
    const settings = await CRMUserSettings.findOne({ userId: decoded.userId }).lean();

    return apiSuccess({
      chatFunnels: settings?.chatFunnels || {},
      chatLabels: settings?.chatLabels || {},
      labelPresets: settings?.labelPresets || [],
      qrFunnelStages: settings?.qrFunnelStages || [],
    });
  } catch (err) {
    console.error('[crm-settings GET]', err);
    return apiError('Failed to load settings', 500);
  }
}

// PUT /api/admin/crm/settings - Update current user's CRM settings
export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const decoded = await verifyToken(req);
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    const body = await req.json();
    const update: Record<string, any> = {};

    if (body.chatFunnels !== undefined) update.chatFunnels = body.chatFunnels;
    if (body.chatLabels !== undefined) update.chatLabels = body.chatLabels;
    if (body.labelPresets !== undefined) update.labelPresets = body.labelPresets;
    if (body.qrFunnelStages !== undefined) update.qrFunnelStages = body.qrFunnelStages;

    if (Object.keys(update).length === 0) {
      return apiError('No settings to update', 400);
    }

    const CRMUserSettings = getCRMUserSettings();
    const settings = await CRMUserSettings.findOneAndUpdate(
      { userId: decoded.userId },
      { $set: update },
      { upsert: true, new: true }
    );

    return apiSuccess(settings, 'Settings saved');
  } catch (err) {
    console.error('[crm-settings PUT]', err);
    return apiError('Failed to save settings', 500);
  }
}
