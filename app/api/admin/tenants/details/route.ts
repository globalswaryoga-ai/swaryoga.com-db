import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getLead } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/tenants/details?email=<ownerEmail>&ownerUserId=<id>
 * Super-admin only. Aggregates a full picture of one tenant:
 *   login account, QR/WhatsApp settings, QR + Meta lead counts, activity.
 * NOTE: passwords are bcrypt-hashed and can NEVER be shown — only whether one is
 * set (use Reset PW to change it).
 */
export async function GET(req: NextRequest) {
  try {
    const decoded: any = verifyToken(req.headers.get('authorization')?.replace('Bearer ', '').trim() || '');
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

    const url = new URL(req.url);
    const email = (url.searchParams.get('email') || '').trim().toLowerCase();
    const ownerUserId = (url.searchParams.get('ownerUserId') || '').trim();
    if (!email && !ownerUserId) {
      return NextResponse.json({ error: 'email or ownerUserId required' }, { status: 400 });
    }

    await connectDB();
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // ── Login account ──
    const userQuery: any = { $or: [] as any[] };
    if (email) userQuery.$or.push({ email });
    if (ownerUserId) userQuery.$or.push({ userId: ownerUserId }, { email: ownerUserId });
    const user = await crmDb.collection('admin_users').findOne(userQuery, {
      projection: { email: 1, userId: 1, username: 1, role: 1, status: 1, isActive: 1, lastLoginAt: 1, createdAt: 1, password: 1 },
    });

    const loginId = user?.userId || user?.email || ownerUserId || email;

    // ── QR / WhatsApp settings ──
    const settings = await crmDb.collection('crm_user_settings').findOne(
      { userId: loginId },
      { projection: { qrConnectedPhoneNumber: 1, permanentTenantId: 1, qrWhatsappEnabled: 1, senderDisplayName: 1, qrBridgeUrl: 1, qrPhoneChangedAt: 1 } },
    );

    // ── Lead counts (scoped to this tenant's owner) ──
    const Lead = getLead();
    const owners = Array.from(new Set([loginId, email, ownerUserId].filter(Boolean)));
    const ownerScope = { $or: [{ createdByUserId: { $in: owners } }, { assignedToUserId: { $in: owners } }] };

    const [qrCount, metaCount, totalCount, byStatusAgg, lastLead] = await Promise.all([
      Lead.countDocuments({ ...ownerScope, source: 'qr_whatsapp' }),
      Lead.countDocuments({ ...ownerScope, source: { $nin: ['qr_whatsapp'] } }),
      Lead.countDocuments(ownerScope),
      Lead.aggregate([{ $match: ownerScope }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
      Lead.find(ownerScope).sort({ createdAt: -1 }).select({ name: 1, phoneNumber: 1, source: 1, createdAt: 1 }).limit(1).lean(),
    ]);

    const byStatus: Record<string, number> = {};
    for (const s of (byStatusAgg as any[])) byStatus[String(s._id || 'unknown')] = s.n;

    return NextResponse.json({
      success: true,
      data: {
        login: user ? {
          email: user.email,
          userId: user.userId,
          username: user.username || null,
          role: user.role || 'admin',
          status: user.status || 'active',
          isActive: user.isActive !== false,
          hasPassword: !!user.password,
          lastLoginAt: user.lastLoginAt || null,
          createdAt: user.createdAt || null,
        } : null,
        whatsapp: {
          connectedNumber: settings?.qrConnectedPhoneNumber || '',
          permanentTenantId: settings?.permanentTenantId || '',
          qrEnabled: !!settings?.qrWhatsappEnabled,
          senderName: settings?.senderDisplayName || '',
          customBridgeUrl: settings?.qrBridgeUrl || '',
          phoneChangedAt: settings?.qrPhoneChangedAt || null,
        },
        leads: {
          qr: qrCount,
          meta: metaCount,
          total: totalCount,
          byStatus,
        },
        activity: {
          lastLead: (lastLead as any[])[0] || null,
          lastLoginAt: user?.lastLoginAt || null,
        },
      },
    });
  } catch (err) {
    console.error('[tenants/details] error:', err);
    return NextResponse.json({ error: 'Failed to load tenant details' }, { status: 500 });
  }
}
