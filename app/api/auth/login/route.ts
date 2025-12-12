import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User, Signin } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
