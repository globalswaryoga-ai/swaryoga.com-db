/**
 * @fileoverview Admin endpoint to reset a regular (signup) user's password
 * @description Allows admin/superadmin to reset any non-admin user's password.
 * This is the primary mechanism for handling "forgot password" requests 
 * reported via WhatsApp or other channels.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { notifyPasswordReset } from '@/lib/notifications';

export const dynamic = 'force-dynamic';


export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check — admin required
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = params;

    console.log('[Reset Password] Received ID:', id, 'Type:', typeof id, 'Valid ObjectId:', Types.ObjectId.isValid(id));

    if (!Types.ObjectId.isValid(id)) {
      console.log('[Reset Password] Invalid ObjectId format:', id);
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

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

    await connectDB();

    // Find the user (any user, not just admin)
    const objectId = new Types.ObjectId(id);
    console.log('[Reset Password] Searching for user with ObjectId:', objectId);

    let user = await User.findById(objectId);
    console.log('[Reset Password] User found by ID:', user ? `${user.email}` : 'null');

    if (!user) {
      // Try searching by email as fallback
      user = await User.findOne({ email: id });
      if (user) {
        console.log('[Reset Password] Found by email instead:', user.email);
      } else {
        console.log('[Reset Password] User not found by ID or email:', id);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await User.findByIdAndUpdate(new Types.ObjectId(id), {
      $set: { password: hashedPassword },
    });

    console.log(
      `[Admin Reset Password] Admin "${decoded.userId || decoded.email}" reset password for user "${user.email}" (${id})`
    );

    // Send new password to user via email (fire-and-forget)
    let emailSent = false;
    if (user.email) {
      try {
        const result = await notifyPasswordReset(
          { name: user.name || '', email: user.email, phone: user.phone },
          { newPassword, resetBy: decoded.userId || decoded.email || 'admin' },
        );
        emailSent = result.email.success;
      } catch (emailErr) {
        console.error('[Admin Reset Password] Email notification failed:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${user.email || user.name || id}`,
      emailSent,
    });
  } catch (error: any) {
    console.error('[Admin Reset Password] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    );
  }
}
