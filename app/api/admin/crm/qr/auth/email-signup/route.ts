import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import bcryptjs from 'bcryptjs';

export const dynamic = 'force-dynamic';

interface SignupRequest {
  email: string;
  password: string;
  phone?: string;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const db = (global as any).mongoClient?.db('swaryoga_admin_crm');
    if (!db) return NextResponse.json({ error: 'Database not connected' }, { status: 500 });

    const { email, password, phone } = (await request.json()) as SignupRequest;

    // Validation
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db.collection('qr_user_accounts').findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Hash password
    const passwordHash = await bcryptjs.hash(password, 10);

    // Create account
    const result = await db.collection('qr_user_accounts').insertOne({
      email: email.toLowerCase(),
      passwordHash,
      phone: phone || null,
      createdAt: new Date(),
      lastLoginAt: null,
      backupEnabled: false,
      retentionDays: 730, // 2 years default
      googleDriveConnected: false,
      googleDriveId: null,
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      userId: result.insertedId.toString(),
      email,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[QR Auth] Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Signup failed' },
      { status: 500 }
    );
  }
}
