/**
 * Auto-provision bridge URL + secret for QR WhatsApp tenants
 * Called on first access to QR page — silently generates & saves if not already configured
 * 
 * POST /api/admin/crm/whatsapp/qr/auto-provision
 * Returns: { success: boolean, bridgeUrl?: string, bridgeSecret?: string }
 */

import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';

const BRIDGE_BASE_URL = process.env.FALLBACK_BRIDGE_URL || 'https://bridge.swaryoga.com';

export async function POST(req: NextRequest) {
  try {
    // ══════════════════════════════════════════════════════════════════════════
    // AUTHENTICATION
    // ══════════════════════════════════════════════════════════════════════════
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 403);
    }
    const userId = decoded.userId;

    // Guard: super admin cannot use this endpoint (they have shared bridge)
    const SUPER_ADMIN_IDS = new Set(['admin', 'admincrm']);
    if (SUPER_ADMIN_IDS.has(userId)) {
      return apiError('Super admin uses shared bridge, not auto-provisioned', 400);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // DATABASE CONNECTION
    // ══════════════════════════════════════════════════════════════════════════
    await connectDB();
    const CRMUserSettings = getCRMUserSettings();

    // ══════════════════════════════════════════════════════════════════════════
    // AUTO-PROVISION: Check if already configured, if not generate + save
    // ══════════════════════════════════════════════════════════════════════════
    let settings = await CRMUserSettings.findOne({ userId });

    if (settings?.qrBridgeUrl) {
      // Already configured — return it
      return apiSuccess({
        success: true,
        bridgeUrl: settings.qrBridgeUrl,
        bridgeSecret: settings.qrBridgeSecret,
        created: false, // was already configured
      });
    }

    // Not configured — auto-generate unique bridge URL + secret
    const uniqueId = uuidv4().substring(0, 8); // short unique ID for bridge path
    const bridgeUrl = `${BRIDGE_BASE_URL}/user/${userId}/${uniqueId}`;
    const bridgeSecret = uuidv4(); // random secret

    // Save to crm_user_settings
    if (!settings) {
      settings = new CRMUserSettings({ userId });
    }
    settings.qrBridgeUrl = bridgeUrl;
    settings.qrBridgeSecret = bridgeSecret;
    await settings.save();

    console.log(`[QR Auto-Provision] userId=${userId} — generated bridgeUrl=${bridgeUrl}`);

    return apiSuccess({
      success: true,
      bridgeUrl,
      bridgeSecret,
      created: true, // newly created
    });
  } catch (error: any) {
    const msg = error?.message || 'Unknown error';
    console.error('[QR Auto-Provision] Error:', msg, error);
    return apiError(msg, error?.status || 500);
  }
}
