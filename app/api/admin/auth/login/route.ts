import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { userId, email, password } = await request.json();

    const identifier = (typeof userId === 'string' && userId.trim())
      ? userId.trim()
      : (typeof email === 'string' && email.trim())
        ? email.trim()
        : '';

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Missing userId/email or password' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get User model
    const { User } = await import('@/lib/db');
    const UserModel = User;

    // Find user by userId or email (people often try email on the admin screen).
    const user = await UserModel.findOne({
      $or: [
        { userId: identifier },
        { email: identifier.toLowerCase() },
      ],
    });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if admin
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Generate JWT token using the same secret/config as the rest of the app.
    const token = generateToken({
      userId: user.userId,
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.role,
      permissions: user.permissions,
    });

    return NextResponse.json(
      {
        success: true,
        token,
        user: {
          userId: user.userId,
          email: user.email,
          role: user.role,
          isAdmin: user.isAdmin,
          permissions: user.permissions
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 500 }
    );
  }
}
