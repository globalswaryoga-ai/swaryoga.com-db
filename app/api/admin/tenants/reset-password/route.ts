import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getTenantModel } from '@/lib/tenant/tenantSchemas';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tenants/reset-password
 * Super-admin only. Resets a tenant's login password (swaryoga_admin_crm.admin_users).
 * Body: { email: string, ownerUserId?: string, newPassword: string }
 */
export async function POST(req: NextRequest) {
  try {
    const decoded: any = verifyToken(req.headers.get('authorization')?.replace('Bearer ', '').trim() || '');
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const ownerUserId = String(body?.ownerUserId || '').trim().toLowerCase();
    const newPassword = String(body?.newPassword || '');
    if (!email && !ownerUserId) return NextResponse.json({ error: 'email or ownerUserId required' }, { status: 400 });
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    await connectDB();
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const hash = await bcrypt.hash(newPassword, 12);
    const identifiers = [
      ...(email ? [{ email }, { userId: email }] : []),
      ...(ownerUserId ? [{ userId: ownerUserId }, { email: ownerUserId }] : []),
    ];
    const account = await crmDb.collection('admin_users').findOne(
      { $or: identifiers },
      { collation: { locale: 'en', strength: 2 }, projection: { _id: 1, email: 1 } },
    );
    if (!account) {
      // Older tenants created from Tenant Management did not get an
      // admin_users record. Reset PW doubles as a safe repair for those rows.
      const Tenant = getTenantModel();
      const tenant = await Tenant.findOne({
        $or: [
          ...(email ? [{ ownerEmail: email }] : []),
          ...(ownerUserId ? [{ ownerUserId }] : []),
        ],
      }).collation({ locale: 'en', strength: 2 }).lean() as any;
      if (!tenant) {
        return NextResponse.json({ error: 'No tenant login account found' }, { status: 404 });
      }

      const repairedEmail = String(tenant.ownerEmail || email).trim().toLowerCase();
      const repairedUserId = String(tenant.ownerUserId || ownerUserId || repairedEmail).trim().toLowerCase();
      const now = new Date();
      await crmDb.collection('admin_users').insertOne({
        userId: repairedUserId,
        email: repairedEmail,
        password: hash,
        name: tenant.ownerName || tenant.name || repairedUserId,
        phone: tenant.ownerPhone || '',
        role: 'admin',
        isAdmin: true,
        isActive: true,
        status: 'active',
        tenantSlug: tenant.slug,
        planId: tenant.plan || 'free',
        planName: tenant.plan || 'free',
        setupComplete: false,
        loginCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      return NextResponse.json({ success: true, repaired: true, message: `Login created and password set for ${repairedEmail}` });
    }

    await crmDb.collection('admin_users').updateOne(
      { _id: account._id },
      { $set: { password: hash, updatedAt: new Date() } },
    );

    return NextResponse.json({ success: true, message: `Password reset for ${account.email || email || ownerUserId}` });
  } catch (err) {
    console.error('[tenants/reset-password] error:', err);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
