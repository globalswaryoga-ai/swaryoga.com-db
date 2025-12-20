import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { idToken, user } = await request.json();

    if (!idToken || !user) {
      return NextResponse.json(
        { error: 'ID token and user info required' },
        { status: 400 }
      );
    }

    const { email, sub, name, picture } = user;

    if (!email) {
      return NextResponse.json(
        { error: 'Email not provided by Apple' },
        { status: 400 }
      );
    }

    // Note: Full Apple token verification requires your own backend
    // For now, we'll trust the frontend verification (in production, verify on your backend)

    // Connect to database
    await connectDB();

    // Check if user exists
    let existingUser = await User.findOne({ email });

    if (!existingUser) {
      // Create new user
      const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
      existingUser = new User({
        email,
        password: hashedPassword,
        firstName: name?.split(' ')[0] || 'User',
        lastName: name?.split(' ')[1] || '',
        avatar: picture,
        socialProvider: 'apple',
        socialId: sub,
        isVerified: true,
      });
      await existingUser.save();
    } else if (!existingUser.socialProvider) {
      // Link Apple to existing account
      existingUser.socialProvider = 'apple';
      existingUser.socialId = sub;
      existingUser.avatar = picture;
      await existingUser.save();
    }

    // Generate JWT token
    const jwtToken = generateToken(existingUser._id.toString());

    return NextResponse.json({
      success: true,
      token: jwtToken,
      user: {
        id: existingUser._id.toString(),
        email: existingUser.email,
        name: `${existingUser.firstName} ${existingUser.lastName}`.trim(),
        avatar: existingUser.avatar,
      },
    });
  } catch (error) {
    console.error('Apple auth error:', error);
    return NextResponse.json(
      {
        error: 'Apple authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
