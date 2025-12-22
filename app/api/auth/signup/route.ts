/**
 * @fileoverview User Signup Endpoint
 * @author Swar Yoga Team
 * @copyright 2025 Global Swar Yoga AI - All Rights Reserved
 * @protected This code is protected under intellectual property laws
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { generateToken } from '@/lib/auth';
import { apiError, apiSuccess, logError, validateRequired } from '@/lib/api-error';
import { checkRateLimit, getClientId } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

// Rate limiting: 5 signup attempts per 10 minutes per IP
const SIGNUP_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5,
};

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientId = getClientId(request.headers);
    const rateLimitCheck = checkRateLimit(clientId, SIGNUP_RATE_LIMIT);
    
    if (!rateLimitCheck.allowed) {
      const retryAfter = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: 'Too many signup attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
        },
        { 
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() }
        }
      );
    }

    const body = await request.json();
    const { name, email, phone, countryCode, country, state, gender, age, profession, password } = body;

    // Validate required fields
    const required = ['name', 'email', 'phone', 'country', 'state', 'gender', 'age', 'profession', 'password'];
    const validation = validateRequired(body, required);
    if (!validation.valid) {
      return apiError('VALIDATION_ERROR', `Missing fields: ${validation.missing?.join(', ')}`);
    }

    // Connect to database
    try {
      await connectDB();
    } catch (dbError) {
      logError('signup/connectDB', dbError);
      return apiError('DATABASE_ERROR', 'Database connection failed');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return apiError('VALIDATION_ERROR', 'Invalid email format');
    }

    // Check if user already exists
    try {
      const existingUser = await User.findOne({ email: email.trim() }).lean();
      if (existingUser) {
        return apiError('VALIDATION_ERROR', 'Email already registered');
      }
    } catch (checkError) {
      logError('signup/checkExisting', checkError);
      return apiError('DATABASE_ERROR', 'Failed to check existing user');
    }

    // Validate age
    const ageNumber = typeof age === 'string' ? parseInt(age, 10) : age;
    if (!Number.isFinite(ageNumber) || ageNumber < 13 || ageNumber > 150) {
      return apiError('VALIDATION_ERROR', 'Age must be between 13 and 150');
    }

    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password.trim(), 10);
    } catch (hashError) {
      logError('signup/hashPassword', hashError);
      return apiError('SERVER_ERROR', 'Password processing failed');
    }

    // Create new user
    try {
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
      let token;
      try {
        token = generateToken({
          userId: user._id.toString(),
          email: user.email,
        });
      } catch (tokenError) {
        logError('signup/generateToken', tokenError);
        return apiError('SERVER_ERROR', 'Token generation failed');
      }

      return apiSuccess({
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
          profileImage: user.profileImage,
        },
      }, 201);
    } catch (createError: any) {
      logError('signup/createUser', createError);

      // Handle MongoDB unique constraint error
      if (createError.code === 11000) {
        return apiError('VALIDATION_ERROR', 'Email already registered');
      }

      // Handle validation errors
      if (createError.name === 'ValidationError') {
        const messages = Object.values(createError.errors)
          .map((err: any) => err.message)
          .join('; ');
        return apiError('VALIDATION_ERROR', `Validation error: ${messages}`);
      }

      return apiError('SERVER_ERROR', 'Failed to create user');
    }
  } catch (error) {
    logError('signup/POST', error);
    return apiError('SERVER_ERROR');
  }
}
