/**
 * @fileoverview User Login Authentication Endpoint
 * @author Swar Yoga Team
 * @copyright 2025 Global Swar Yoga AI - All Rights Reserved
 * @protected This code is protected under intellectual property laws
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { getUserByEmail, recordUserSignin } from '@/lib/repositories/userRepository';
import { apiError, apiSuccess, logError, validateRequired } from '@/lib/api-error';
import { checkRateLimit, getClientId } from '@/lib/rate-limit';
import { createRequestContext, logRequest, logResponse, logApiError, Timer } from '@/lib/logging';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';


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

    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    // Database connection is managed automatically via BunnyDB wrappers

    // Find user (case-insensitive)
    let user;
    try {
      user = await getUserByEmail(email);
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
      // The client persists this login for 1 year (see lib/sessionManager.ts),
      // so the JWT itself must last as long — otherwise it silently expires
      // after the default 7 days while the UI still shows the user as logged
      // in, degrading every authenticated API call (e.g. paid course video
      // access) to guest access with no visible error.
      token = generateToken({
        userId: user.id,
        email: user.email,
      }, '365d');
    } catch (tokenError) {
      logApiError(requestContext, 'Token generation failed', 500);
      logError('login/generateToken', tokenError);
      return apiError('SERVICE_UNAVAILABLE', 'Token generation failed');
    }

    // Log signin attempt (non-critical)
    try {
      await recordUserSignin({
        email: user.email,
        userId: user.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      });
    } catch (signinError) {
      logError('login/signinLog', signinError);
      // Don't fail the login if signin logging fails
    }

    // Look up leadNumber from CRM Lead (match by phone or email)
    let leadNumber: string | undefined;
    try {
      const Lead = getLead();
      const phoneClean = user.phone?.replace(/\D/g, '');
      let lead = null;
      
      // Try to find by phone first
      if (phoneClean && phoneClean.length >= 10) {
        lead = await Lead.findOne({
          phoneNumber: { $regex: phoneClean.slice(-10) + '$' }
        }).lean();
      }
      
      // Fallback to email if no phone match
      if (!lead && user.email) {
        lead = await Lead.findOne({ email: user.email }).lean();
      }
      
      if (lead && (lead as any).leadNumber) {
        leadNumber = String((lead as any).leadNumber);
      }
    } catch (leadError) {
      // Non-fatal: login should still succeed even if lead lookup fails
      logError('login/leadLookup', leadError);
    }

    logRequest(requestContext, 'Login successful', { email, userId: user.id });
    logResponse(requestContext, 200, timer.elapsed(), 'Login completed');

    return apiSuccess({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        leadNumber: leadNumber,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    logApiError(requestContext, error instanceof Error ? error : String(error), 500);
    logError('login/POST', error);
    return apiError('SERVER_ERROR');
  }
}
