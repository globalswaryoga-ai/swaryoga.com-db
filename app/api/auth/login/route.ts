/**
 * @fileoverview User Login Authentication Endpoint
 * @author Swar Yoga Team
 * @copyright 2025 Global Swar Yoga AI - All Rights Reserved
 * @protected This code is protected under intellectual property laws
 */

import { NextRequest } from 'next/server';
import { connectDB, User, Signin } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { apiError, apiSuccess, logError, validateRequired } from '@/lib/api-error';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Validate input
    const body = await request.json();
    const validation = validateRequired(body, ['email', 'password']);
    if (!validation.valid) {
      return apiError('VALIDATION_ERROR', `Missing required fields: ${validation.missing?.join(', ')}`);
    }

    const { email, password } = body;

    // Connect to database
    try {
      await connectDB();
    } catch (dbError) {
      logError('login/connectDB', dbError);
      return apiError('DATABASE_ERROR', 'Database connection failed. Please try again later.');
    }

    // Find user
    let user;
    try {
      user = await User.findOne({ email }).lean();
    } catch (findError) {
      logError('login/findUser', findError, { email });
      return apiError('SERVICE_UNAVAILABLE', 'Authentication service error');
    }

    if (!user) {
      return apiError('AUTHENTICATION_FAILED', 'Invalid email or password');
    }

    // Compare passwords
    let passwordMatch;
    try {
      passwordMatch = await bcrypt.compare(password, user.password);
    } catch (bcryptError) {
      logError('login/bcryptCompare', bcryptError);
      return apiError('SERVICE_UNAVAILABLE', 'Authentication service error');
    }

    if (!passwordMatch) {
      return apiError('AUTHENTICATION_FAILED', 'Invalid email or password');
    }

    // Generate token
    let token;
    try {
      token = generateToken({
        userId: user._id.toString(),
        email: user.email,
      });
    } catch (tokenError) {
      logError('login/generateToken', tokenError);
      return apiError('SERVICE_UNAVAILABLE', 'Token generation failed');
    }

    // Log signin attempt (non-critical)
    try {
      const signin = new Signin({
        email: user.email,
        userId: user._id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      });
      await signin.save();
    } catch (signinError) {
      logError('login/signinLog', signinError);
      // Don't fail the login if signin logging fails
    }

    return apiSuccess({
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
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    logError('login/POST', error);
    return apiError('SERVER_ERROR');
  }
}
