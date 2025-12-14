import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User, Signin } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    try {
      await connectDB();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed. Please try again later.' },
        { status: 503 }
      );
    }

    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400 }
      );
    }

    // Find user
    let user;
    try {
      user = await User.findOne({ email });
    } catch (findError) {
      console.error('Error finding user:', findError);
      return NextResponse.json(
        { error: 'Authentication service error' },
        { status: 503 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Compare passwords
    let passwordMatch;
    try {
      passwordMatch = await bcrypt.compare(password, user.password);
    } catch (bcryptError) {
      console.error('Error comparing passwords:', bcryptError);
      return NextResponse.json(
        { error: 'Authentication service error' },
        { status: 503 }
      );
    }

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate token
    let token;
    try {
      token = generateToken({
        userId: user._id.toString(),
        email: user.email,
      });
    } catch (tokenError) {
      console.error('Error generating token:', tokenError);
      return NextResponse.json(
        { error: 'Token generation failed' },
        { status: 503 }
      );
    }

    // Log signin attempt
    try {
      const signin = new Signin({
        email: user.email,
        userId: user._id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      });
      await signin.save();
    } catch (signinError) {
      console.error('Error logging signin:', signinError);
      // Don't fail the login if signin logging fails
    }

    return NextResponse.json(
      { 
        message: 'Login successful', 
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
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
