/**
 * @fileoverview User Login Authentication Endpoint
 * @author Swar Yoga Team
 * @copyright 2025 Global Swar Yoga AI - All Rights Reserved
 * @protected This code is protected under intellectual property laws
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User, Signin } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { apiError, apiSuccess, logError, validateRequired } from '@/lib/api-error';
import { checkRateLimit, getClientId } from '@/lib/rate-limit';
import { createRequestContext, logRequest, logResponse, logApiError, Timer } from '@/lib/logging';
import bcrypt from 'bcryptjs';

// Rate limiting: 10 login attempts per minute per IP
const LOGIN_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
};

export async function POST(request: NextRequest) {
  const timer = new Timer();
  const requestContext = createRequestContext(request);
  
  try {
    logRequest(requestContext, 'Login attempt');

    // Apply rate limiting
    const clientId = getClientId(request.headers);
    const rateLimitCheck = checkRateLimit(clientId, LOGIN_RATE_LIMIT);
    
    if (!rateLimitCheck.allowed) {
      const retryAfter = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000);
      logApiError(requestContext, 'Rate limit exceeded', 429, { retryAfter });
      return NextResponse.json(
        {
          success: false,
          error: 'Too many login attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
        },
        { 
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() }
        }
      );
    }

    // Validate input
    const body = await request.json();
    const validation = validateRequired(body, ['email', 'password']);
    if (!validation.valid) {
      logApiError(requestContext, 'Validation failed', 400, { missing: validation.missing });
      return apiError('VALIDATION_ERROR', `Missing required fields: ${validation.missing?.join(', ')}`);
    }

    const { email, password } = body;

    // Connect to database
    try {
      await connectDB();
    } catch (dbError) {
      logApiError(requestContext, 'Database connection failed', 503);
      logError('login/connectDB', dbError);
      return apiError('DATABASE_ERROR', 'Database connection failed. Please try again later.');
    }

    // Find user
    let user;
    try {
      user = await User.findOne({ email }).lean();
    } catch (findError) {
      logApiError(requestContext, 'Failed to find user', 503, { email });
      logError('login/findUser', findError, { email });
      return apiError('SERVICE_UNAVAILABLE', 'Authentication service error');
    }

    if (!user) {
      logApiError(requestContext, 'User not found', 401, { email });
      return apiError('AUTHENTICATION_FAILED', 'Invalid email or password');
    }

    // Compare passwords
    let passwordMatch;
    try {
      passwordMatch = await bcrypt.compare(password, user.password);
    } catch (bcryptError) {
      logApiError(requestContext, 'Password comparison failed', 503);
      logError('login/bcryptCompare', bcryptError);
      return apiError('SERVICE_UNAVAILABLE', 'Authentication service error');
    }

    if (!passwordMatch) {
      logApiError(requestContext, 'Password mismatch', 401, { email });
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
      logApiError(requestContext, 'Token generation failed', 500);
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

    logRequest(requestContext, 'Login successful', { email, userId: user._id.toString() });
    logResponse(requestContext, 200, timer.elapsed(), 'Login completed');

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
    logApiError(requestContext, error instanceof Error ? error : String(error), 500);
    logError('login/POST', error);
    return apiError('SERVER_ERROR');
  }
}
