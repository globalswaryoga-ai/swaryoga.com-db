/**
 * Auto-provision bridge URL + secret for QR WhatsApp tenants
 * Called on first access to QR page — uses permanent tenant ID
 * ALL users (including Super Admin) use /tenant/{permanentTenantId} pattern
 * 
 * POST /api/admin/crm/whatsapp/qr/auto-provision
 * Returns: { success: boolean, bridgeUrl?: string, bridgeSecret?: string, permanentTenantId?: string }
 */

import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';

// Use same bridge URL config as qr-bridge/route.ts
const DEFAULT_BRIDGE_URL = 'http://localhost:3333';
const BRIDGE_BASE_URL =
  process.env.WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL ||
  process.env.WHATSAPP_BRIDGE_URL ||
  DEFAULT_BRIDGE_URL;

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

    // ══════════════════════════════════════════════════════════════════════════
    // DATABASE CONNECTION
    // ══════════════════════════════════════════════════════════════════════════
    await connectDB();
    const CRMUserSettings = getCRMUserSettings();

    // ══════════════════════════════════════════════════════════════════════════
    // AUTO-PROVISION: Check if permanent tenant ID & secret exist
    // ══════════════════════════════════════════════════════════════════════════
    let settings = await CRMUserSettings.findOne({ userId });

    // ── PERMANENT TENANT ID (ONE USER = ONE BRIDGE SESSION) ──
    // The live bridge isolates sessions via x-user-id header, so provision users
    // against the working base bridge URL while keeping their own secret/session.
    if (settings?.permanentTenantId) {
      const bridgeUrl = BRIDGE_BASE_URL;
      const existingSecret = settings.qrBridgeSecret;
      
      // Ensure secret exists (generate if missing)
      let bridgeSecret = existingSecret;
      if (!bridgeSecret) {
        bridgeSecret = randomBytes(16).toString('hex');
        await CRMUserSettings.updateOne(
          { userId },
          { $set: { qrBridgeSecret: bridgeSecret } }
        );
      }

      console.log(`[QR Auto-Provision] ════════════════════════════════════════`);
      console.log(`[QR Auto-Provision] userId=${userId}`);
      console.log(`[QR Auto-Provision] permanentTenantId=${settings.permanentTenantId}`);
      console.log(`[QR Auto-Provision] Using isolated header-based bridge session=${bridgeUrl}`);
      console.log(`[QR Auto-Provision] ════════════════════════════════════════`);

      return apiSuccess({
        success: true,
        bridgeUrl,
        bridgeSecret,
        permanentTenantId: settings.permanentTenantId,
        created: false, // already provisioned
      });
    }

    // Fallback: If somehow permanentTenantId doesn't exist (shouldn't happen)
    // Return error asking user to contact admin
    console.warn(`[QR Auto-Provision] BLOCKED: User ${userId} has no permanentTenantId`);
    return apiError(
      'Permanent tenant ID not found. Please contact support.',
      422
    );
  } catch (error: any) {
    const msg = error?.message || 'Unknown error';
    console.error('[QR Auto-Provision] Error:', msg, error);
    return apiError(msg, error?.status || 500);
  }
}
