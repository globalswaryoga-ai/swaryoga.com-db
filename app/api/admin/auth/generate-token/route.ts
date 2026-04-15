import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';

/** Generate a new JWT token for testing/development */
export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Token generation disabled in production' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const token = generateToken({
      userId: body.userId || 'admin',
      email: body.email || 'admin@swaryoga.com',
      isAdmin: body.isAdmin !== false,
      username: body.username || body.userId || 'admin',
      role: body.role || 'admin',
    });

    return NextResponse.json({ token }, { status: 200 });
  } catch (error) {
    console.error('[generate-token] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
