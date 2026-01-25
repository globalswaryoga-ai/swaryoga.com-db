import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getUser } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    // NOTE: Non-superadmin admins still need the admin list for CRM lead assignment dropdowns.
    // We return a minimal, safe set of fields below.

    await connectDB();
    const User = getUser();

    // Fetch all admin users (minimal fields for assignment UI)
    const adminUsers = await User.find({ isAdmin: true })
      .select('_id userId email name role isAdmin createdAt')
      .lean();

    return NextResponse.json({ success: true, data: adminUsers }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error fetching admin users:', msg);
    return NextResponse.json({ error: 'Failed to fetch admin users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const isSuperAdmin = decoded?.userId === 'admin' || (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'));
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, email, password, name, permissions, permissionsV2 } = await request.json();

    // Validation
    if (!userId || !email || !password) {
      return NextResponse.json(
        { error: 'userId, email, and password are required' },
        { status: 400 }
      );
    }

    // Default permissions if none provided
    const finalPermissions = Array.isArray(permissions) && permissions.length > 0 
      ? permissions 
      : (permissionsV2 ? [] : ['crm']);

    // Validate permissions if legacy array provided
    if (finalPermissions.length > 0) {
      const validPermissions = [
        'all', 'crm', 'whatsapp', 'email', 'broadcasts', 'analytics', 
        'users', 'workshops', 'templates', 'settings', 'payments', 'reports',
      ];
      const invalidPerms = finalPermissions.filter((p: string) => {
        // Allow granular format "module:action" (e.g., "leads:read", "whatsapp:send")
        if (p.includes(':')) return false;
        return !validPermissions.includes(p);
      });
      if (invalidPerms.length > 0) {
        return NextResponse.json(
          { error: `Invalid permissions: ${invalidPerms.join(', ')}` },
          { status: 400 }
        );
      }
    }

    await connectDB();
    const User = getUser();

    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Check if userId already exists (case-insensitive)
    const existingUserId = await User.findOne({ 
      userId: { $regex: new RegExp(`^${userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } 
    });
    if (existingUserId) {
      return NextResponse.json(
        { error: `Username "${userId}" already exists (existing: "${existingUserId.userId}")` },
        { status: 409 }
      );
    }

    // Check if email already exists (case-insensitive)
    const existingEmail = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } 
    });
    if (existingEmail) {
      // If the user exists but is not an admin, return a more helpful error
      if (!existingEmail.isAdmin) {
        return NextResponse.json(
          { error: 'Email already exists for a non-admin user. You can only use unique emails for admin users. (If you want to convert this user to admin, please update their permissions.)', userId: existingEmail.userId, isAdmin: false },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Email "${normalizedEmail}" already exists` },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin user
    const newAdminUser = new User({
      userId: userId.trim(),
      email: normalizedEmail,
      name: name || userId, // Use provided name or default to userId
      password: hashedPassword,
      isAdmin: true,
      role: 'admin',
      permissions: finalPermissions,
      permissionsV2: permissionsV2 || undefined,
    });

    await newAdminUser.save();

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: newAdminUser._id,
          userId: newAdminUser.userId,
          email: newAdminUser.email,
          name: newAdminUser.name,
          permissions: newAdminUser.permissions,
          permissionsV2: newAdminUser.permissionsV2,
          createdAt: newAdminUser.createdAt,
        },
        message: 'Admin user created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error creating admin user:', msg);
    return NextResponse.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    );
  }
}
