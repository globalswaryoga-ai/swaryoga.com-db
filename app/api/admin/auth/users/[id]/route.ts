import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getUser } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const isSuperAdmin =
      decoded?.userId === 'admin' ||
      (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'));
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid admin user ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const update: Record<string, any> = {};

    // userId (optional - super admin only)
    if (body.userId !== undefined) {
      const userId = String(body.userId || '').trim();
      if (!userId) {
        return NextResponse.json({ error: 'userId cannot be empty' }, { status: 400 });
      }
      if (userId.length < 3) {
        return NextResponse.json({ error: 'userId must be at least 3 characters' }, { status: 400 });
      }
      update.userId = userId;
    }

    // Email (optional)
    if (body.email !== undefined) {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email) {
        return NextResponse.json({ error: 'email cannot be empty' }, { status: 400 });
      }
      update.email = email;
    }

    // Name (optional)
    if (body.name !== undefined) {
      const name = String(body.name || '').trim();
      if (name) {
        update.name = name;
      }
    }

    // Permissions V2 (new granular permissions - optional)
    if (body.permissionsV2 !== undefined) {
      update.permissionsV2 = body.permissionsV2;
    }

    // Permissions (legacy - optional, for backward compatibility)
    if (body.permissions !== undefined) {
      const permissions = Array.isArray(body.permissions)
        ? body.permissions.map((p: any) => String(p).trim()).filter(Boolean)
        : [];
      if (permissions.length === 0 && !update.permissionsV2) {
        return NextResponse.json({ error: 'At least one permission is required' }, { status: 400 });
      }
      const validPermissions = [
        'all', 'manager', 'crm', 'whatsapp', 'email', 'broadcasts', 'analytics', 
        'users', 'workshops', 'templates', 'settings', 'payments', 'reports',
      ];
      const invalidPerms = permissions.filter((p: string) => {
        // Allow granular format "module:action"
        if (p.includes(':')) return false;
        return !validPermissions.includes(p);
      });
      if (invalidPerms.length > 0) {
        return NextResponse.json(
          { error: `Invalid permissions: ${invalidPerms.join(', ')}` },
          { status: 400 }
        );
      }
      update.permissions = permissions;
    }

    // Password reset (optional)
    if (body.password !== undefined) {
      const password = String(body.password || '');
      if (password.length < 6) {
        return NextResponse.json({ error: 'password must be at least 6 characters' }, { status: 400 });
      }
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(password, salt);
    }

    // Role (optional)
    if (body.role !== undefined) {
      const validRoles = ['superadmin', 'dm', 'manager', 'admin', 'user'];
      const role = String(body.role || '').trim();
      if (role && validRoles.includes(role)) {
        update.role = role;
      }
    }

    // Managed User IDs (for manager role)
    if (body.managedUserIds !== undefined) {
      const managedIds = Array.isArray(body.managedUserIds)
        ? body.managedUserIds.filter((id: any) => typeof id === 'string' && id.trim()).map((id: string) => id.trim())
        : [];
      update.managedUserIds = managedIds;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await connectDB();
    const User = getUser();

    // Ensure target exists and is admin user
    const existing = await User.findOne({ _id: new Types.ObjectId(id), isAdmin: true });
    if (!existing) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    // Prevent userId duplicates
    if (update.userId) {
      const dupUserId = await User.findOne({ userId: { $regex: new RegExp(`^${update.userId}$`, 'i') }, _id: { $ne: new Types.ObjectId(id) } });
      if (dupUserId) {
        return NextResponse.json({ error: 'Username (userId) already exists' }, { status: 409 });
      }
    }

    // Prevent email duplicates
    if (update.email) {
      const dup = await User.findOne({ email: update.email, _id: { $ne: new Types.ObjectId(id) } });
      if (dup) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }
    }

    const updated = await User.findByIdAndUpdate(
      new Types.ObjectId(id),
      { $set: update },
      { new: true }
    ).select('_id userId email name permissions permissionsV2 role managedUserIds createdAt');

    return NextResponse.json(
      { success: true, data: updated, message: 'Admin user updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating admin user:', error);
    return NextResponse.json({ error: 'Failed to update admin user' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const isSuperAdmin =
      decoded?.userId === 'admin' ||
      (Array.isArray(decoded?.permissions) && decoded.permissions.includes('all'));
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Validate MongoDB ID
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid admin user ID' }, { status: 400 });
    }

    await connectDB();

    // Get User model
    const User = getUser();

    // Delete admin user
    const result = await User.deleteOne({ _id: new Types.ObjectId(id), isAdmin: true });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: 'Admin user deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return NextResponse.json(
      { error: 'Failed to delete admin user' },
      { status: 500 }
    );
  }
}
