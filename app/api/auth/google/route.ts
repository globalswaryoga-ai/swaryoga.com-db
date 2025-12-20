import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { connectDB, User } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const { email, name, picture, sub } = payload;

    if (!email) {
      return NextResponse.json({ error: 'Email not provided by Google' }, { status: 400 });
    }

    // Connect to database
    await connectDB();

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
      user = new User({
        email,
        password: hashedPassword,
        firstName: name?.split(' ')[0] || 'User',
        lastName: name?.split(' ')[1] || '',
        avatar: picture,
        socialProvider: 'google',
        socialId: sub,
        isVerified: true,
      });
      await user.save();
    } else if (!user.socialProvider) {
      // Link Google to existing account
      user.socialProvider = 'google';
      user.socialId = sub;
      user.avatar = picture;
      await user.save();
    }

    // Generate JWT token
    const jwtToken = generateToken(user._id.toString());

    return NextResponse.json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: 'Google authentication failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
