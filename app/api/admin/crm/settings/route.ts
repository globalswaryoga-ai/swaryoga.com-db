import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';

/**
 * Generate a unique bridge secret for a user.
 * Format: swar-<userId-prefix>-<random-hex>  (always unique per user)
 */
function generateUniqueBridgeSecret(userId: string): string {
  const prefix = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toLowerCase();
  const rand = randomBytes(8).toString('hex'); // 16-char hex
  return `swar-${prefix}-${rand}`;
}

// Default/shared bridge URL from env (for auto-fill)
const DEFAULT_BRIDGE_URL =
  process.env.WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.WHATSAPP_BRIDGE_URL ||
  '';

// GET /api/admin/crm/settings - Load current user's CRM settings
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    const CRMUserSettings = getCRMUserSettings();
    let settings: any = await CRMUserSettings.findOne({ userId: decoded.userId }).lean();

    // ── Auto-generate unique bridge secret for new users ──
    // Every user gets a unique secret on first access so configs never collide.
    if (!settings?.qrBridgeSecret) {
      const uniqueSecret = generateUniqueBridgeSecret(decoded.userId);
      settings = await CRMUserSettings.findOneAndUpdate(
        { userId: decoded.userId },
        {
          $setOnInsert: { userId: decoded.userId },
          $set: { qrBridgeSecret: uniqueSecret },
        },
        { upsert: true, new: true }
      ).lean();
      console.log(`[crm-settings] Auto-generated unique bridge secret for user ${decoded.userId}`);
    }

    return apiSuccess({
      chatFunnels: settings?.chatFunnels || {},
      chatLabels: settings?.chatLabels || {},
      labelPresets: settings?.labelPresets || [],
      qrFunnelStages: settings?.qrFunnelStages || [],
      qrBridgeUrl: settings?.qrBridgeUrl || '',
      qrBridgeSecret: settings?.qrBridgeSecret || '',
      qrWhatsappEnabled: settings?.qrWhatsappEnabled || false,
      // Expose shared bridge URL so frontend can auto-fill for new users
      defaultBridgeUrl: DEFAULT_BRIDGE_URL,
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

    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }

    const body = await req.json();
    const update: Record<string, any> = {};

    if (body.chatFunnels !== undefined) update.chatFunnels = body.chatFunnels;
    if (body.chatLabels !== undefined) update.chatLabels = body.chatLabels;
    if (body.labelPresets !== undefined) update.labelPresets = body.labelPresets;
    if (body.qrFunnelStages !== undefined) update.qrFunnelStages = body.qrFunnelStages;
    if (body.qrBridgeUrl !== undefined) update.qrBridgeUrl = body.qrBridgeUrl;
    if (body.qrBridgeSecret !== undefined) update.qrBridgeSecret = body.qrBridgeSecret;
    if (body.qrWhatsappEnabled !== undefined) update.qrWhatsappEnabled = body.qrWhatsappEnabled;

    if (Object.keys(update).length === 0) {
      return apiError('No settings to update', 400);
    }

    const CRMUserSettings = getCRMUserSettings();

    // ── Uniqueness check for bridge secret ──
    // Ensure no other user has the same bridge secret (prevents collision / shared access)
    if (update.qrBridgeSecret) {
      const conflict = await CRMUserSettings.findOne({
        userId: { $ne: decoded.userId },
        qrBridgeSecret: update.qrBridgeSecret,
      }).lean();
      if (conflict) {
        // Collision detected — auto-regenerate a new unique secret
        update.qrBridgeSecret = generateUniqueBridgeSecret(decoded.userId);
        console.warn(`[crm-settings] Bridge secret collision for ${decoded.userId}, auto-regenerated`);
      }
    }

    const settings = await CRMUserSettings.findOneAndUpdate(
      { userId: decoded.userId },
      { $set: update },
      { upsert: true, new: true }
    );

    return apiSuccess(settings);
  } catch (err) {
    console.error('[crm-settings PUT]', err);
    return apiError('Failed to save settings', 500);
  }
}
