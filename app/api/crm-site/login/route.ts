import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';
import { logError } from '@/lib/api-error';
import { findBunnyAdmin, recordBunnyAdminSignin } from '@/lib/bunnyAuthRepository';
import { getClientId } from '@/lib/rate-limit';

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// Helper to return JSON with CORS headers
function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

/**
 * POST /api/crm-site/login
 * 
 * Authenticates CRM tenant users from Bunny Database admin_users_sql
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid request body', success: false }, 400);
    }

    const { userId, email, password } = body;

    // Accept either userId or email
    const identifier = (typeof userId === 'string' && userId.trim())
      ? userId.trim()
      : (typeof email === 'string' && email.trim())
        ? email.trim()
        : '';

    if (!identifier || !password) {
      return jsonResponse(
        { error: 'Email and password are required', success: false },
        400
      );
    }

    // Find user in BunnyDB admin_users_sql
    const user = await findBunnyAdmin(identifier);

    if (!user) {
      return jsonResponse(
        { error: 'Invalid credentials', success: false },
        401
      );
    }

    // Verify password against password_hash
    const storedHash = user.passwordHash || (user as any).password || '';
    let isPasswordValid = false;
    if (storedHash.startsWith('$2')) {
      isPasswordValid = await bcrypt.compare(password, storedHash);
    } else {
      isPasswordValid = password === storedHash;
    }

    if (!isPasswordValid) {
      return jsonResponse(
        { error: 'Invalid credentials', success: false },
        401
      );
    }

    // Generate JWT token using shared auth utility
    const token = generateToken({
      userId: user.userId || user.email,
      email: user.email,
      name: user.name || user.userId,
      role: user.role || 'admin',
      isAdmin: true, // CRM users are admins of their tenant
      tenantSlug: user.tenantSlug || '',
    });

    // Record signin in BunnyDB
    try {
      await recordBunnyAdminSignin({
        email: user.email,
        userId: user.userId,
        ipAddress: getClientId(request.headers),
        userAgent: request.headers.get('user-agent'),
      });
    } catch (e) {
      console.warn('[crm-site/login] Signin record warning:', e);
    }

    return jsonResponse({
      success: true,
      token,
      user: {
        userId: user.userId || user.email,
        email: user.email,
        name: user.name || user.userId,
        role: user.role || 'admin',
        isAdmin: true,
        tenantSlug: user.tenantSlug || '',
        phone: user.phone || '',
      },
    });
  } catch (err: any) {
    logError('crm-site/login', err);
    return jsonResponse(
      { error: 'Login failed. Please try again.', success: false },
      500
    );
  }
}
