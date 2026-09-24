import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { extensionJson, extensionOptions, requireExtensionAccess } from '@/lib/extensionAccess';
import { BUILT_IN_FUNNEL_STATUSES } from '@/lib/extensionFunnelStages';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return extensionOptions();
}

/**
 * GET /api/extension/funnel-stages
 * Returns the fixed built-in stages plus this user's own custom ones.
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = await requireExtensionAccess(req);
    if (!decoded) {
      return extensionJson({ success: false, error: 'Extension access not approved for this user' }, 403);
    }

    await connectDB();
    const CRMUserSettings = getCRMUserSettings();
    const settings: any = await CRMUserSettings.findOne({ userId: decoded.userId }, { extensionFunnelStages: 1 }).lean();

    return extensionJson({
      success: true,
      builtIn: BUILT_IN_FUNNEL_STATUSES,
      custom: settings?.extensionFunnelStages || [],
    });
  } catch (err) {
    console.error('[extension/funnel-stages]', err);
    return extensionJson({ success: false, error: 'Internal error' }, 500);
  }
}

/**
 * POST /api/extension/funnel-stages
 * Body: { stage: string }
 * Adds a new custom funnel stage for this user (from the sidebar's + button).
 */
export async function POST(req: NextRequest) {
  try {
    const decoded = await requireExtensionAccess(req);
    if (!decoded) {
      return extensionJson({ success: false, error: 'Extension access not approved for this user' }, 403);
    }

    const { stage } = await req.json();
    const clean = String(stage || '').trim();
    if (!clean) {
      return extensionJson({ success: false, error: 'stage is required' }, 400);
    }
    if (clean.length > 40) {
      return extensionJson({ success: false, error: 'Keep the stage name under 40 characters' }, 400);
    }

    await connectDB();
    const CRMUserSettings = getCRMUserSettings();
    await CRMUserSettings.updateOne(
      { userId: decoded.userId },
      { $addToSet: { extensionFunnelStages: clean } },
      { upsert: true }
    );

    return extensionJson({ success: true, stage: clean });
  } catch (err) {
    console.error('[extension/funnel-stages POST]', err);
    return extensionJson({ success: false, error: 'Internal error' }, 500);
  }
}
