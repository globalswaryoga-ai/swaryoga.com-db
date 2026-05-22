export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import mongoose from 'mongoose';
import { getWhatsAppBridgeUrl } from '@/lib/whatsappBridgeConfig';
import { normalizeConnectedPhone, reconcileQrConnectedPhone } from '@/lib/qrSessionIsolation';

const BRIDGE_BASE_URL = getWhatsAppBridgeUrl();

/**
 * Generate a unique bridge secret for a user.
 * Format: swar-<userId-prefix>-<random-hex>  (always unique per user)
 */
function generateUniqueBridgeSecret(userId: string): string {
  const prefix = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toLowerCase();
  const rand = randomBytes(8).toString('hex'); // 16-char hex
  return `swar-${prefix}-${rand}`;
}

// GET /api/admin/crm/settings - Load current user's CRM settings
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId && !decoded?.username) {
      return apiError('Unauthorized', 401);
    }

    // Resolve effective userId — admin tokens have username not userId
    const effectiveUserId = (decoded?.userId || decoded?.username || 'admin') as string;

    const CRMUserSettings = getCRMUserSettings();
    let settings: any = await CRMUserSettings.findOne({ userId: effectiveUserId }).lean();

    // ── Auto-generate unique bridge secret for new users ──
    if (!settings?.qrBridgeSecret) {
      const uniqueSecret = generateUniqueBridgeSecret(effectiveUserId);
      settings = await CRMUserSettings.findOneAndUpdate(
        { userId: effectiveUserId },
        {
          $setOnInsert: { userId: effectiveUserId },
          $set: { qrBridgeSecret: uniqueSecret },
        },
        { upsert: true, new: true }
      ).lean();
      console.log(`[crm-settings] Auto-generated unique bridge secret for user ${effectiveUserId}`);
    }

    const reconciled = await reconcileQrConnectedPhone(effectiveUserId, {
      isSuperAdmin: isSuperAdmin(decoded),
      storedPhone: settings?.qrConnectedPhoneNumber || '',
      phoneChangedAt: settings?.qrPhoneChangedAt || null,
    });
    const resolvedConnectedPhone = reconciled.resolvedPhone;

    // Base settings visible to all admin users
    const response: Record<string, any> = {
      chatFunnels: settings?.chatFunnels || {},
      chatLabels: settings?.chatLabels || {},
      labelPresets: settings?.labelPresets || [],
      qrFunnelStages: settings?.qrFunnelStages || [],
      pinnedChats: settings?.pinnedChats || [],
      senderDisplayName: settings?.senderDisplayName || '',
      qrConnectedPhoneNumber: resolvedConnectedPhone,
    };

    // QR bridge data: return for all admin users
    // Derive bridge URL from permanentTenantId, fallback to stored qrBridgeUrl
    const derivedUrl = settings?.permanentTenantId ? BRIDGE_BASE_URL : '';
    response.qrBridgeUrl = derivedUrl || settings?.qrBridgeUrl || '';
    response.qrBridgeSecret = settings?.qrBridgeSecret || '';
    response.permanentTenantId = settings?.permanentTenantId || null;

    // Only super admin sees qrWhatsappEnabled (team access flag)
    if (isSuperAdmin(decoded)) {
      response.qrWhatsappEnabled = settings?.qrWhatsappEnabled || false;
    }

    return apiSuccess(response);
  } catch (err) {
    console.error('[crm-settings GET]', err);
    return apiError('Failed to load settings', 500);
  }
}

// PUT /api/admin/crm/settings - Update current user's CRM settings
export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.isAdmin && !decoded?.userId && !decoded?.username) {
      return apiError('Unauthorized', 401);
    }

    // Resolve effective userId — admin tokens have username not userId
    const effectiveUserId = (decoded?.userId || decoded?.username || 'admin') as string;

    const body = await req.json();
    const update: Record<string, any> = {};

    if (body.chatFunnels !== undefined) update.chatFunnels = body.chatFunnels;
    if (body.chatLabels !== undefined) update.chatLabels = body.chatLabels;
    if (body.labelPresets !== undefined) update.labelPresets = body.labelPresets;
    if (body.qrFunnelStages !== undefined) update.qrFunnelStages = body.qrFunnelStages;
    if (body.pinnedChats !== undefined) update.pinnedChats = body.pinnedChats;
    if (body.senderDisplayName !== undefined) update.senderDisplayName = body.senderDisplayName;
    if (body.qrConnectedPhoneNumber !== undefined) update.qrConnectedPhoneNumber = normalizeConnectedPhone(body.qrConnectedPhoneNumber);
    if (body.qrPhoneChangedAt !== undefined) update.qrPhoneChangedAt = body.qrPhoneChangedAt;
    // QR bridge settings — super admin only
    if (isSuperAdmin(decoded)) {
      if (body.qrBridgeUrl !== undefined) update.qrBridgeUrl = body.qrBridgeUrl;
      if (body.qrBridgeSecret !== undefined) update.qrBridgeSecret = body.qrBridgeSecret;
      if (body.qrWhatsappEnabled !== undefined) update.qrWhatsappEnabled = body.qrWhatsappEnabled;
    }

    if (Object.keys(update).length === 0) {
      return apiError('No settings to update', 400);
    }

    const CRMUserSettings = getCRMUserSettings();

    // ── Uniqueness check for bridge secret ──
    if (update.qrBridgeSecret) {
      const conflict = await CRMUserSettings.findOne({
        userId: { $ne: effectiveUserId },
        qrBridgeSecret: update.qrBridgeSecret,
      }).lean();
      if (conflict) {
        update.qrBridgeSecret = generateUniqueBridgeSecret(effectiveUserId);
        console.warn(`[crm-settings] Bridge secret collision for ${effectiveUserId}, auto-regenerated`);
      }
    }

    const settings = await CRMUserSettings.findOneAndUpdate(
      { userId: effectiveUserId },
      {
        $set: update,
        $setOnInsert: { userId: effectiveUserId },
      },
      { upsert: true, new: true }
    );

    return apiSuccess(settings);
  } catch (err) {
    console.error('[crm-settings PUT]', err);
    return apiError('Failed to save settings', 500);
  }
}
