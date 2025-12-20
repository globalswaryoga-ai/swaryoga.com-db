import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { connectDB, User } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { accessToken, userInfo } = await request.json();

    if (!accessToken || !userInfo) {
      return NextResponse.json(
        { error: 'Access token and user info required' },
        { status: 400 }
      );
    }

    const { id, email, name, picture } = userInfo;

    if (!email) {
      return NextResponse.json(
        { error: 'Email not provided by Facebook' },
        { status: 400 }
      );
    }

    // Verify token with Facebook API (optional but recommended)
    try {
      const verifyResponse = await axios.get('https://graph.facebook.com/me', {
        params: {
          access_token: accessToken,
          fields: 'id,email',
        },
      });
      if (!verifyResponse.data.id) {
        throw new Error('Token verification failed');
      }
    } catch (err) {
      console.error('Facebook token verification failed:', err);
      return NextResponse.json(
        { error: 'Facebook token verification failed' },
        { status: 401 }
      );
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
        avatar: picture?.data?.url,
        socialProvider: 'facebook',
        socialId: id,
        isVerified: true,
      });
      await user.save();
    } else if (!user.socialProvider) {
      // Link Facebook to existing account
      user.socialProvider = 'facebook';
      user.socialId = id;
      user.avatar = picture?.data?.url;
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
    console.error('Facebook auth error:', error);
    return NextResponse.json(
      {
        error: 'Facebook authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
