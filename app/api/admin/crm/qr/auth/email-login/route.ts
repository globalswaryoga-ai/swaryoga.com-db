import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import bcryptjs from 'bcryptjs';
import { sign } from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const db = (global as any).mongoClient?.db('swaryoga_admin_crm');
    if (!db) return NextResponse.json({ error: 'Database not connected' }, { status: 500 });

    const { email, password } = (await request.json()) as LoginRequest;

    // Validation
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Find user
    const user = await db.collection('qr_user_accounts').findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Verify password
    const isValid = await bcryptjs.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Update last login
    await db.collection('qr_user_accounts').updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } }
    );

    // Generate JWT token
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    const token = sign(
      {
        userId: user._id.toString(),
        email: user.email,
        type: 'qr_backup',
      },
      secret,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      userId: user._id.toString(),
      email: user.email,
      backupEnabled: user.backupEnabled || false,
      googleDriveConnected: user.googleDriveConnected || false,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[QR Auth] Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
