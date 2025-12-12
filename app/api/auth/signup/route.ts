import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, email, phone, countryCode, country, state, gender, age, profession, password } = body;

    // Log received data for debugging
    console.log('Received signup data:', {
      name: name ? `✓ ${name.substring(0, 10)}...` : '✗ missing',
      email: email ? `✓ ${email.substring(0, 10)}...` : '✗ missing',
      phone: phone ? `✓ ${phone.substring(0, 10)}...` : '✗ missing',
      countryCode: countryCode ? `✓ ${countryCode}` : '✗ missing',
      country: country ? `✓ ${country}` : '✗ missing',
      state: state ? `✓ ${state}` : '✗ missing',
      gender: gender ? `✓ ${gender}` : '✗ missing',
      age: age ? `✓ ${age}` : '✗ missing',
      profession: profession ? `✓ ${profession.substring(0, 10)}...` : '✗ missing',
      password: password ? '✓ provided' : '✗ missing',
    });

    // Validate input - trim strings and check for empty values
    const missingFields = [];
    if (!name?.trim()) missingFields.push('name');
    if (!email?.trim()) missingFields.push('email');
    if (!phone?.trim()) missingFields.push('phone');
    if (!country?.trim()) missingFields.push('country');
    if (!state?.trim()) missingFields.push('state');
    if (!gender?.trim()) missingFields.push('gender');
    if (!age && age !== 0) missingFields.push('age');  // Allow 0 but not undefined/null
    if (!profession?.trim()) missingFields.push('profession');
    if (!password?.trim()) missingFields.push('password');

    if (missingFields.length > 0) {
      console.error('Missing fields:', missingFields);
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.trim() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Convert age safely (handle both string and number)
    const ageNumber = typeof age === 'string' ? parseInt(age, 10) : age;
    
    if (isNaN(ageNumber) || ageNumber < 13 || ageNumber > 150) {
      return NextResponse.json(
        { error: 'Age must be a valid number between 13 and 150' },
        { status: 400 }
      );
    }

    // Create new user with all signup data
    const user = new User({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      countryCode: countryCode || '+91',
      country: country.trim(),
      state: state.trim(),
      gender: gender.trim(),
      age: ageNumber,
      profession: profession.trim(),
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
          profileId: user.profileId,
          name: user.name, 
          email: user.email,
          phone: user.phone,
          country: user.country,
          state: user.state,
          gender: user.gender,
          age: user.age,
          profession: user.profession,
          profileImage: user.profileImage
        } 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    
    // Handle MongoDB unique constraint error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map((err: any) => err.message)
        .join('; ');
      console.error('Validation error details:', messages);
      return NextResponse.json(
        { error: `Validation error: ${messages}` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
