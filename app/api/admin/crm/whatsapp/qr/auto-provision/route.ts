export const dynamic = 'force-dynamic';
/**
 * Auto-provision bridge URL + secret for QR WhatsApp tenants
 * Called on first access to QR page — uses permanent tenant ID
 * ALL users (including Super Admin) use /tenant/{permanentTenantId} pattern
 *
 * POST /api/admin/crm/whatsapp/qr/auto-provision
 * Returns: { success: boolean, bridgeUrl?: string, bridgeSecret?: string, permanentTenantId?: string }
 */

import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getWhatsAppBridgeUrl } from '@/lib/whatsappBridgeConfig';

const BRIDGE_BASE_URL = getWhatsAppBridgeUrl();

export async function POST(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId && !decoded?.username) {
      return apiError('Unauthorized', 403);
    }

    // Resolve effective userId — admin tokens have username not userId
    const userId = (decoded?.userId || decoded?.username || 'admin') as string;
    const superAdmin = isSuperAdmin(decoded);

    await connectDB();
    const CRMUserSettings = getCRMUserSettings();

    let settings = await CRMUserSettings.findOne({ userId }).lean() as any;

    // ── If settings exist with permanentTenantId ──
    if (settings?.permanentTenantId) {
      const bridgeUrl = BRIDGE_BASE_URL;
      let bridgeSecret = settings.qrBridgeSecret;

      if (!bridgeSecret) {
        bridgeSecret = randomBytes(16).toString('hex');
        await CRMUserSettings.updateOne(
          { userId },
          { $set: { qrBridgeSecret: bridgeSecret } }
        );
      }

      console.log(`[QR Auto-Provision] userId=${userId} permanentTenantId=${settings.permanentTenantId}`);

      return apiSuccess({
        success: true,
        bridgeUrl,
        bridgeSecret,
        permanentTenantId: settings.permanentTenantId,
        created: false,
      });
    }

    // ── Super admins: auto-provision with their userId as session key ──
    if (superAdmin) {
      const bridgeSecret = settings?.qrBridgeSecret || randomBytes(16).toString('hex');
      const permanentTenantId = userId; // Use userId as their permanent session key

      // Upsert the settings with permanentTenantId
      await CRMUserSettings.findOneAndUpdate(
        { userId },
        {
          $set: {
            qrBridgeSecret: bridgeSecret,
            permanentTenantId,
            qrWhatsappEnabled: true,
          },
          $setOnInsert: { userId },
        },
        { upsert: true, new: true }
      );

      console.log(`[QR Auto-Provision] Super admin ${userId} auto-provisioned with tenantId=${permanentTenantId}`);

      return apiSuccess({
        success: true,
        bridgeUrl: BRIDGE_BASE_URL,
        bridgeSecret,
        permanentTenantId,
        created: true,
      });
    }

    // Non-super-admin with no permanentTenantId
    console.warn(`[QR Auto-Provision] BLOCKED: User ${userId} has no permanentTenantId`);
    return apiError('Permanent tenant ID not found. Please contact support.', 422);

  } catch (error: any) {
    const msg = error?.message || 'Unknown error';
    console.error('[QR Auto-Provision] Error:', msg, error);
    return apiError(msg, error?.status || 500);
  }
}
