import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';
import { findBunnyAdmin, recordBunnyAdminSignin } from '@/lib/bunnyAuthRepository';

export async function POST(request: Request) {
  try {
    const { userId, password } = await request.json();

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'Missing userId or password', success: false },
        { status: 400 }
      );
    }

    const trimmedUser = String(userId).trim();
    const trimmedPass = String(password).trim();

    // 1. Direct superadmin master credentials
    if (trimmedUser === '9779006820' && trimmedPass === 'Raahdaa@drac') {
      const token = generateToken({ userId: 'admincrm', name: 'Swar Yoga Admin', isAdmin: true, role: 'superadmin' }, '365d');
      const response = NextResponse.json({ success: true, token, user: { userId: 'admincrm', name: 'Swar Yoga Admin' } });
      const cookieOptions = {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 365 * 24 * 60 * 60, // 1 year
        path: '/',
      };
      response.cookies.set('adminToken', token, cookieOptions);
      response.cookies.set('admin_token', token, cookieOptions);
      return response;
    }

    // 2. Bunny DB admin account authentication
    try {
      const user = await findBunnyAdmin(trimmedUser);
      if (user && user.isAdmin) {
        const isPasswordValid = await bcrypt.compare(trimmedPass, user.passwordHash);
        if (isPasswordValid) {
          const token = generateToken(
            {
              userId: user.userId,
              name: user.name,
              email: user.email,
              role: user.role || 'admin',
              isAdmin: true,
            },
            '365d'
          );

          // Record signin asynchronously
          recordBunnyAdminSignin(user.userId, 'mobile-chat').catch(() => {});

          const response = NextResponse.json({
            success: true,
            token,
            user: { userId: user.userId, name: user.name, email: user.email, role: user.role },
          });
          const cookieOptions = {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            maxAge: 365 * 24 * 60 * 60, // 1 year
            path: '/',
          };
          response.cookies.set('adminToken', token, cookieOptions);
          response.cookies.set('admin_token', token, cookieOptions);
          return response;
        }
      }
    } catch (dbErr) {
      console.warn('[MobileChatLogin] Bunny DB admin lookup error:', dbErr);
    }

    return NextResponse.json(
      { error: 'Invalid User ID or Password', success: false },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error', success: false },
      { status: 500 }
    );
  }
}
