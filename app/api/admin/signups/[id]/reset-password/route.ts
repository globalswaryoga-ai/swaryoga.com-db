/**
 * @fileoverview Admin endpoint to reset a regular (signup) user's password using Bunny Database
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import bcrypt from 'bcryptjs';
import { notifyPasswordReset } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json().catch(() => null);
    if (!body || !body.password) {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 });
    }

    const newPassword = String(body.password).trim();
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Find user in Bunny DB
    const res = await bunnyExecute({
      sql: 'SELECT id, email, name, phone FROM users WHERE id = ? OR email = ? LIMIT 1',
      args: [id, id]
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = res.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    await bunnyExecute({
      sql: 'UPDATE users SET password = ?, updatedAt = ? WHERE id = ?',
      args: [hashedPassword, now, String(user.id)]
    });

    let emailSent = false;
    try {
      const emailResult = await notifyPasswordReset(
        { name: String(user.name || ''), email: String(user.email || ''), phone: String(user.phone || '') },
        { newPassword }
      );
      emailSent = emailResult.email;
    } catch (e) {
      console.warn('[Reset Password] Failed to send notification email:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      emailSent,
    });
  } catch (error) {
    console.error('[Reset Password] Error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
