import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';

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

export async function POST(request: Request) {
  try {
    const { userId, email, password } = await request.json();

    const identifier = (typeof userId === 'string' && userId.trim())
      ? userId.trim()
      : (typeof email === 'string' && email.trim())
        ? email.trim()
        : '';

    if (!identifier || !password) {
      return jsonResponse(
        { error: 'Missing userId/email or password', success: false },
        400
      );
    }

    await connectDB();

    // Get User model
    const { User } = await import('@/lib/db');
    const UserModel = User;

    // Find user by userId or email (people often try email on the admin screen).
    const user = await UserModel.findOne({
      $or: [
        { userId: identifier },
        { email: identifier.toLowerCase() },
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

    // Check if admin
    if (!user.isAdmin) {
      return jsonResponse(
        { error: 'Admin access required', success: false },
        403
      );
    }

    // For admins, tenantId is their userId (they own their own CRM tenant)
    const tenantId = user.userId || user.email || user._id?.toString();

    // Generate JWT token using the same secret/config as the rest of the app.
    const token = generateToken({
      userId: user.userId,
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.role,
      permissions: user.permissions,
      permissionsV2: user.permissionsV2 || null,
      managedUserIds: user.managedUserIds || [], // For managers: IDs of users they supervise
      tenantId, // Add tenantId to JWT for Life Planner access
    });

    return jsonResponse({
      success: true,
      token,
      tenantId, // Return tenantId so client can store it
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        isAdmin: user.isAdmin,
        permissions: user.permissions,
        permissionsV2: user.permissionsV2 || null,
        managedUserIds: user.managedUserIds || [],
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Login failed', success: false },
      500
    );
  }
}
