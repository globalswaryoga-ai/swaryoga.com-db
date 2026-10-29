import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { findBunnyAdmin } from '@/lib/bunnyAuthRepository';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/auth/auto-login
 * Auto-login endpoint for swarsakshi9@gmail.com
 * Uses a pre-configured service token stored in env variables
 */
export async function GET(request: NextRequest) {
  try {
    // Check for valid auto-login token in request (from environment)
    const autoLoginToken = request.headers.get('x-auto-login-key');
    const expectedKey = process.env.ADMIN_AUTO_LOGIN_KEY;

    if (!autoLoginToken || !expectedKey || autoLoginToken !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const email = 'swarsakshi9@gmail.com';
    const user = await findBunnyAdmin(email);

    const userId = user?.userId || 'admin_swarsakshi';
    const token = generateToken({
      userId,
      email: user?.email || email,
      isAdmin: true,
      role: 'superadmin',
      permissions: ['all'],
      tenantId: userId,
    }, '30d');

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        userId,
        name: user?.name || 'Swar Sakshi',
        email: user?.email || email,
        isAdmin: true,
        role: 'superadmin',
      },
    });

    response.cookies.set('admin_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });
    response.cookies.set('adminToken', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (error: any) {
    console.error('[Auto-login] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Auto-login failed' },
      { status: 500 }
    );
  }
}
