import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { name, email, phone, countryCode, country, state, gender, age, profession, password } = await request.json();

    // Validate input
    if (!name || !email || !phone || !country || !state || !gender || !age || !profession || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with all signup data
    const user = new User({
      name,
      email,
      phone,
      countryCode: countryCode || '+91',
      country,
      state,
      gender,
      age: parseInt(age),
      profession,
      password: hashedPassword,
    });

    await user.save();

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    return NextResponse.json(
      { 
        message: 'User registered successfully', 
        token, 
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email,
          phone: user.phone,
          country: user.country,
          state: user.state,
          gender: user.gender,
          age: user.age,
          profession: user.profession
        } 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
