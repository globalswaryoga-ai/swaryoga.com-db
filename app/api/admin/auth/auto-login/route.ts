import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import jwt from 'jsonwebtoken';

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

    await connectDB();

    // Find or create swarsakshi9999@gmail.com admin user
    const email = 'swarsakshi9999@gmail.com';
    let user = await User.findOne({ email, isAdmin: true });

    if (!user) {
      console.log('[Auto-login] Creating admin account for swarsakshi9999@gmail.com');
      user = new User({
        name: 'Swar Sakshi',
        email,
        phone: '+91-admin',
        isAdmin: true,
        password: 'auto-login-service', // Placeholder, not used for this flow
      });
      await user.save();
    }

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        isAdmin: true,
        autoLogin: true,
      },
      secret,
      { expiresIn: '30d' } // 30 days for persistent login
    );

    console.log('[Auto-login] Generated token for swarsakshi9@gmail.com');

    return NextResponse.json({
      success: true,
      token,
      user: {
        userId: user._id?.toString(),
        name: user.name,
        email: user.email,
        isAdmin: true,
      },
    });
  } catch (error: any) {
    console.error('[Auto-login] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Auto-login failed' },
      { status: 500 }
    );
  }
}
