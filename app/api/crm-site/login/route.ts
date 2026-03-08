import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';
import { logError } from '@/lib/api-error';

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
 * Authenticates CRM tenant users from swaryoga_admin_crm.admin_users
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

    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Find user in CRM admin_users collection
    const user = await crmDb.collection('admin_users').findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { userId: identifier.toLowerCase() },
      ],
    });

    if (!user) {
      return jsonResponse(
        { error: 'Invalid credentials', success: false },
        401
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return jsonResponse(
        { error: 'Invalid credentials', success: false },
        401
      );
    }

    // Generate JWT token using shared auth utility (ensures same secret)
    const token = generateToken({
      userId: user.userId || user.email,
      email: user.email,
      name: user.name,
      role: user.role || 'admin',
      isAdmin: true, // CRM users are always admins
    });

    // Update last login
    await crmDb.collection('admin_users').updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } }
    );

    return jsonResponse({
      success: true,
      token,
      user: {
        userId: user.userId || user.email,
        email: user.email,
        name: user.name,
        role: user.role || 'admin',
        isAdmin: user.isAdmin,
        tenantSlug: user.tenantSlug,
        phone: user.phone,
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
