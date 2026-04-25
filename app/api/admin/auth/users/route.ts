import { NextRequest, NextResponse } from 'next/server';


import { connectDB, getUser } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

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
      .select('_id userId email name role managedUserIds permissions permissionsV2 isAdmin createdAt')
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

    const { userId, email, password, name, permissions, permissionsV2, role, managedUserIds, convertExisting } = await request.json();

    // Validation
    if (!userId || !email || !password) {
      return NextResponse.json(
        { error: 'userId, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['superadmin', 'dm', 'manager', 'admin', 'user'];
    const finalRole = validRoles.includes(role) ? role : 'admin';
    
    // Validate managedUserIds (for manager role)
    const finalManagedUserIds = finalRole === 'manager' && Array.isArray(managedUserIds)
      ? managedUserIds.filter((id: any) => typeof id === 'string' && id.trim())
      : [];

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
      // Super admin can convert existing non-admin user to admin
      if (!existingEmail.isAdmin && convertExisting) {
        // Update existing user to become admin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        existingEmail.isAdmin = true;
        existingEmail.role = finalRole;
        existingEmail.permissions = finalPermissions;
        existingEmail.permissionsV2 = permissionsV2 || undefined;
        existingEmail.managedUserIds = finalManagedUserIds;
        existingEmail.password = hashedPassword;
        if (name) existingEmail.name = name;
        // Keep the original userId, or update if provided
        if (userId && userId !== existingEmail.userId) {
          // Check if the new userId is unique
          const userIdCheck = await User.findOne({ 
            userId: { $regex: new RegExp(`^${userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            _id: { $ne: existingEmail._id }
          });
          if (userIdCheck) {
            return NextResponse.json(
              { error: `Username "${userId}" already exists` },
              { status: 409 }
            );
          }
          existingEmail.userId = userId.trim();
        }
        
        await existingEmail.save();
        
        return NextResponse.json(
          {
            success: true,
            data: {
              _id: existingEmail._id,
              userId: existingEmail.userId,
              email: existingEmail.email,
              name: existingEmail.name,
              permissions: existingEmail.permissions,
              permissionsV2: existingEmail.permissionsV2,
              role: existingEmail.role,
              managedUserIds: existingEmail.managedUserIds,
              createdAt: existingEmail.createdAt,
            },
            message: 'Existing user converted to admin successfully',
            converted: true,
          },
          { status: 200 }
        );
      }
      
      // If the user exists but is not an admin, offer to convert
      if (!existingEmail.isAdmin) {
        return NextResponse.json(
          { 
            error: 'Email already exists for a non-admin user. Set convertExisting=true to convert this user to admin.', 
            existingUserId: existingEmail.userId, 
            existingName: existingEmail.name,
            isAdmin: false,
            canConvert: true 
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Email "${normalizedEmail}" already exists for an admin user` },
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
      role: finalRole,
      permissions: finalPermissions,
      permissionsV2: permissionsV2 || undefined,
      managedUserIds: finalManagedUserIds,
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
          role: newAdminUser.role,
          managedUserIds: newAdminUser.managedUserIds,
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
      { error: msg || 'Failed to create admin user' },
      { status: 500 }
    );
  }
}
