import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, name, phone, countryCode, country, state, gender, age, profession } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Convert age to number
    const ageNumber = typeof age === 'string' ? parseInt(age, 10) : age;
    
    if (isNaN(ageNumber) || ageNumber < 13 || ageNumber > 150) {
      return NextResponse.json(
        { error: 'Age must be a valid number between 13 and 150' },
        { status: 400 }
      );
    }

    // Update user profile
    const user = await User.findOneAndUpdate(
      { email: email.trim() },
      {
        name: name?.trim() || '',
        phone: phone?.trim() || '',
        countryCode: countryCode || '+91',
        country: country?.trim() || '',
        state: state?.trim() || '',
        gender: gender?.trim() || '',
        age: ageNumber,
        profession: profession?.trim() || '',
        updatedAt: new Date(),
      },
      { new: true }
    ).select('-password');

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
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
