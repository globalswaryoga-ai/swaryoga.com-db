import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { extensionJson, extensionOptions } from '@/lib/extensionAccess';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return extensionOptions();
}

/**
 * GET /api/extension/me
 * Called by the browser extension right after login (and periodically) to
 * check whether this user has been approved for extension access by a
 * super admin, independent of their general CRM login being valid.
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId) {
      return extensionJson({ success: false, error: 'Unauthorized' }, 401);
    }

    const superAdmin = isSuperAdmin(decoded);
    let allowed = superAdmin;

    if (!allowed) {
      await connectDB();
      const CRMUserSettings = getCRMUserSettings();
      const settings = await CRMUserSettings.findOne({ userId: decoded.userId }, { extensionEnabled: 1 }).lean();
      allowed = !!(settings as any)?.extensionEnabled;
    }

    return extensionJson({
      success: true,
      allowed,
      isSuperAdmin: superAdmin,
      userId: decoded.userId,
      name: (decoded as any).name || decoded.userId,
    });
  } catch (err) {
    console.error('[extension/me]', err);
    return extensionJson({ success: false, error: 'Internal error' }, 500);
  }
}
