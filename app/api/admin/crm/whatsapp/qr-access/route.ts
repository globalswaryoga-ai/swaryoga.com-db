import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { getCRMUserSettings } from '@/lib/schemas/enterpriseSchemas';
import { apiError, apiSuccess } from '@/lib/api-error';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


/**
 * GET /api/admin/crm/whatsapp/qr-access
 * Super admin only: List all CRM users and their QR WhatsApp access status.
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 401);
    }
    if (!isSuperAdmin(decoded)) {
      return apiError('Super admin access required', 403);
    }

    await connectDB();
    const CRMUserSettings = getCRMUserSettings();

    // Get all user settings with QR-related fields
    const allSettings = await CRMUserSettings.find(
      {},
      {
        userId: 1,
        qrWhatsappEnabled: 1,
        qrBridgeUrl: 1,
        qrBridgeSecret: 1,
        updatedAt: 1,
      }
    ).lean();

    // Also get admin users from the users collection to show all potential users
    const { default: mongoose } = await import('mongoose');
    const db = mongoose.connection.db;
    if (!db) {
      return apiError('Database not connected', 500);
    }

    // Try to get admin users from the main users collection
    const usersCollection = db.collection('users');
    const adminUsers = await usersCollection
      .find(
        { isAdmin: true },
        { projection: { userId: 1, name: 1, email: 1, role: 1 } }
      )
      .toArray();

    // Build a map of settings by userId
    const settingsMap = new Map<string, any>();
    for (const s of allSettings) {
      settingsMap.set(s.userId, s);
    }

    // Merge admin users with their QR settings
    const users = adminUsers.map((u: any) => {
      const uid = u.userId || u.email || '';
      const settings = settingsMap.get(uid);
      return {
        userId: uid,
        name: u.name || uid,
        email: u.email || '',
        role: u.role || 'admin',
        qrWhatsappEnabled: settings?.qrWhatsappEnabled || false,
        hasOwnBridge: !!settings?.qrBridgeUrl,
        bridgeUrl: settings?.qrBridgeUrl || '',
        bridgeSecret: settings?.qrBridgeSecret || '',
      };
    });

    // Also add any settings entries that don't match an admin user
    for (const s of allSettings) {
      if (!adminUsers.find((u: any) => (u.userId || u.email) === s.userId)) {
        users.push({
          userId: s.userId,
          name: s.userId,
          email: '',
          role: 'admin',
          qrWhatsappEnabled: s.qrWhatsappEnabled || false,
          hasOwnBridge: !!s.qrBridgeUrl,
          bridgeUrl: s.qrBridgeUrl || '',
          bridgeSecret: s.qrBridgeSecret || '',
        });
      }
    }

    return apiSuccess({ users });
  } catch (err) {
    console.error('[qr-access GET]', err);
    return apiError('Failed to fetch QR access list', 500);
  }
}

/**
 * PUT /api/admin/crm/whatsapp/qr-access
 * Super admin only: Enable/disable QR WhatsApp access for a specific user.
 * Also allows setting a bridge URL for a user.
 * 
 * Body: { targetUserId: string, qrWhatsappEnabled?: boolean, qrBridgeUrl?: string, qrBridgeSecret?: string }
 */
export async function PUT(req: NextRequest) {
  try {
    const decoded = verifyToken(req.headers.get('authorization') || '');
    if (!decoded?.userId || !decoded?.isAdmin) {
      return apiError('Unauthorized', 401);
    }
    if (!isSuperAdmin(decoded)) {
      return apiError('Super admin access required', 403);
    }

    const body = await req.json();
    const { targetUserId, qrWhatsappEnabled, qrBridgeUrl, qrBridgeSecret } = body;

    if (!targetUserId) {
      return apiError('targetUserId is required', 400);
    }

    await connectDB();
    const CRMUserSettings = getCRMUserSettings();

    const update: Record<string, any> = {};
    if (qrWhatsappEnabled !== undefined) update.qrWhatsappEnabled = !!qrWhatsappEnabled;
    if (qrBridgeUrl !== undefined) update.qrBridgeUrl = qrBridgeUrl;
    if (qrBridgeSecret !== undefined) update.qrBridgeSecret = qrBridgeSecret;

    if (Object.keys(update).length === 0) {
      return apiError('No fields to update', 400);
    }

    const result = await CRMUserSettings.findOneAndUpdate(
      { userId: targetUserId },
      { $set: update },
      { upsert: true, new: true }
    );

    console.log(`[qr-access] Super admin ${decoded.userId} updated QR access for ${targetUserId}:`, update);

    return apiSuccess({
      userId: targetUserId,
      qrWhatsappEnabled: result.qrWhatsappEnabled,
      qrBridgeUrl: result.qrBridgeUrl || '',
    });
  } catch (err) {
    console.error('[qr-access PUT]', err);
    return apiError('Failed to update QR access', 500);
  }
}
