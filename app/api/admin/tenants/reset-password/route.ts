import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tenants/reset-password
 * Super-admin only. Resets a tenant's login password (swaryoga_admin_crm.admin_users).
 * Body: { email: string, newPassword: string }
 */
export async function POST(req: NextRequest) {
  try {
    const decoded: any = verifyToken(req.headers.get('authorization')?.replace('Bearer ', '').trim() || '');
    if (!decoded?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isSuperAdmin(decoded)) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const newPassword = String(body?.newPassword || '');
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    await connectDB();
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const hash = await bcrypt.hash(newPassword, 12);
    const r = await crmDb.collection('admin_users').updateOne(
      { email },
      { $set: { password: hash, updatedAt: new Date() } }
    );
    if (!r.matchedCount) {
      return NextResponse.json({ error: 'No login account found for this email' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Password reset for ${email}` });
  } catch (err) {
    console.error('[tenants/reset-password] error:', err);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
