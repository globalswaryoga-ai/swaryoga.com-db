import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const mongoose = await import('mongoose');

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    await connectDB();

    // Get User model
    const User = mongoose.default.models.User || mongoose.default.model('User', new mongoose.Schema({}));

    // Fetch all admin users
    const adminUsers = await User.find({ isAdmin: true })
      .select('_id userId email permissions createdAt')
      .lean();

    return NextResponse.json({ success: true, data: adminUsers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin users:', error);
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

    const { userId, email, password, permissions } = await request.json();

    // Validation
    if (!userId || !email || !password) {
      return NextResponse.json(
        { error: 'userId, email, and password are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json(
        { error: 'At least one permission is required' },
        { status: 400 }
      );
    }

    // Validate permissions
    const validPermissions = ['all', 'crm', 'whatsapp', 'email'];
    const invalidPerms = permissions.filter((p: string) => !validPermissions.includes(p));
    if (invalidPerms.length > 0) {
      return NextResponse.json(
        { error: `Invalid permissions: ${invalidPerms.join(', ')}` },
        { status: 400 }
      );
    }

    await connectDB();

    // Get User model
    const User = mongoose.default.models.User || mongoose.default.model('User', new mongoose.Schema({}));

    // Check if userId already exists
    const existingUserId = await User.findOne({ userId });
    if (existingUserId) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin user
    const newAdminUser = new User({
      userId,
      email,
      password: hashedPassword,
      isAdmin: true,
      role: 'admin',
      permissions,
    });

    await newAdminUser.save();

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: newAdminUser._id,
          userId: newAdminUser.userId,
          email: newAdminUser.email,
          permissions: newAdminUser.permissions,
          createdAt: newAdminUser.createdAt,
        },
        message: 'Admin user created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    );
  }
}
