import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // For admin, check against environment variable or database
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;

    // If admin password is not set in env, use a default for development
    if (!adminPassword && process.env.NODE_ENV !== 'production') {
      console.warn('ADMIN_PASSWORD not set. Using development mode.');
      if (username === adminUsername) {
        // Generate JWT token
        const token = jwt.sign(
          { username, isAdmin: true },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );

        return NextResponse.json({
          success: true,
          token,
          username,
          message: 'Admin login successful'
        });
      }
    }

    // Production: verify password
    if (adminPassword) {
      if (username !== adminUsername) {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      const isPasswordValid = await bcrypt.compare(password, adminPassword);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { username, isAdmin: true },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return NextResponse.json({
        success: true,
        token,
        username,
        message: 'Admin login successful'
      });
    }

    return NextResponse.json(
      { error: 'Admin authentication not configured' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
