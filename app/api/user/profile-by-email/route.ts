import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get email from query params
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Fetch user by email
    const user = await User.findOne({ email: email.trim() }).select('-password');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: user._id,
      profileId: user.profileId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      country: user.country,
      state: user.state,
      gender: user.gender,
      age: user.age,
      profession: user.profession,
      countryCode: user.countryCode,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
