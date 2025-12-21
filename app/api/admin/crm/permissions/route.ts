import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Permission } from '@/lib/schemas/enterpriseSchemas';
import mongoose from 'mongoose';

/**
 * Permission and role management API
 * GET: Fetch permissions/roles
 * POST: Create role/permission
 * PUT: Update role/permission
 * DELETE: Remove role/permission
 */

// Predefined roles with default permissions
const DEFAULT_ROLES = {
  admin: [
    'view_leads',
    'create_leads',
    'edit_leads',
    'delete_leads',
    'view_sales',
    'create_sales',
    'edit_sales',
    'delete_sales',
    'send_messages',
    'view_messages',
    'view_analytics',
    'manage_templates',
    'manage_consent',
    'manage_users',
    'manage_permissions',
  ],
  manager: [
    'view_leads',
    'create_leads',
    'edit_leads',
    'view_sales',
    'create_sales',
    'edit_sales',
    'send_messages',
    'view_messages',
    'view_analytics',
  ],
  sales_rep: ['view_leads', 'create_leads', 'edit_leads', 'view_sales', 'create_sales', 'send_messages', 'view_messages'],
  viewer: ['view_leads', 'view_sales', 'view_messages', 'view_analytics'],
};

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'roles', 'permissions', or 'all'
    const roleId = url.searchParams.get('roleId');
    const limit = Math.min(Number(url.searchParams.get('limit') || 50) || 50, 200);
    const skip = Math.max(Number(url.searchParams.get('skip') || 0) || 0, 0);

    await connectDB();

    const response: any = {};

    if (!type || type === 'permissions' || type === 'all') {
      const permissions = await Permission.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      const totalPermissions = await Permission.countDocuments();
      response.permissions = { items: permissions, total: totalPermissions };
    }

    if (!type || type === 'roles' || type === 'all') {
      // Get Role collection (using mongoose.models.Role if it exists)
      const RoleModel =
        mongoose.models.Role ||
        mongoose.model(
          'Role',
          new mongoose.Schema({
            name: { type: String, required: true, unique: true },
            displayName: String,
            description: String,
            permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
            isDefault: Boolean,
            createdAt: { type: Date, default: Date.now },
          })
        );

      let rolesQuery = RoleModel.find();

      if (roleId) {
        rolesQuery = rolesQuery.where('_id').equals(roleId);
      }

      const roles = await rolesQuery
        .populate('permissions')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      const totalRoles = await RoleModel.countDocuments();

      response.roles = { items: roles, total: totalRoles };
    }

    // Include default roles templates
    response.defaultRoles = Object.entries(DEFAULT_ROLES).map(([name, perms]) => ({
      name,
      permissions: perms,
    }));

    return NextResponse.json({ success: true, data: response }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch permissions/roles';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { resourceType, name, displayName, description, permissionIds } = body;

    await connectDB();

    if (resourceType === 'permission') {
      if (!name || !displayName) {
        return NextResponse.json({ error: 'Missing: name, displayName' }, { status: 400 });
      }

      const permission = await Permission.create({
        name,
        displayName,
        description: description || '',
        createdAt: new Date(),
      });

      return NextResponse.json({ success: true, data: permission }, { status: 201 });
    } else if (resourceType === 'role') {
      if (!name || !displayName) {
        return NextResponse.json({ error: 'Missing: name, displayName' }, { status: 400 });
      }

      const RoleModel =
        mongoose.models.Role ||
        mongoose.model(
          'Role',
          new mongoose.Schema({
            name: { type: String, required: true, unique: true },
            displayName: String,
            description: String,
            permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
            isDefault: Boolean,
            createdAt: { type: Date, default: Date.now },
          })
        );

      const role = await RoleModel.create({
        name,
        displayName,
        description: description || '',
        permissions: permissionIds || [],
        isDefault: false,
        createdAt: new Date(),
      });

      const populatedRole = await role.populate('permissions');

      return NextResponse.json({ success: true, data: populatedRole }, { status: 201 });
    } else {
      return NextResponse.json({ error: 'Invalid resourceType: must be permission or role' }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create permission/role';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { resourceType, id, name, displayName, description, permissionIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing: id' }, { status: 400 });
    }

    await connectDB();

    if (resourceType === 'permission') {
      const permission = await Permission.findByIdAndUpdate(
        id,
        {
          $set: {
            ...(name && { name }),
            ...(displayName && { displayName }),
            ...(description !== undefined && { description }),
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!permission) {
        return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: permission }, { status: 200 });
    } else if (resourceType === 'role') {
      const RoleModel =
        mongoose.models.Role ||
        mongoose.model(
          'Role',
          new mongoose.Schema({
            name: { type: String, required: true, unique: true },
            displayName: String,
            description: String,
            permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
            isDefault: Boolean,
            createdAt: { type: Date, default: Date.now },
          })
        );

      const updateData: any = {};
      if (name) updateData.name = name;
      if (displayName) updateData.displayName = displayName;
      if (description !== undefined) updateData.description = description;
      if (permissionIds) updateData.permissions = permissionIds;
      updateData.updatedAt = new Date();

      const role = await RoleModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).populate(
        'permissions'
      );

      if (!role) {
        return NextResponse.json({ error: 'Role not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: role }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid resourceType: must be permission or role' }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update permission/role';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const resourceType = url.searchParams.get('resourceType'); // permission or role
    const id = url.searchParams.get('id');

    if (!id || !resourceType) {
      return NextResponse.json({ error: 'Missing: id, resourceType' }, { status: 400 });
    }

    await connectDB();

    if (resourceType === 'permission') {
      const result = await Permission.findByIdAndDelete(id);
      if (!result) {
        return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: { deleted: true } }, { status: 200 });
    } else if (resourceType === 'role') {
      const RoleModel =
        mongoose.models.Role ||
        mongoose.model(
          'Role',
          new mongoose.Schema({
            name: { type: String, required: true, unique: true },
            displayName: String,
            description: String,
            permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
            isDefault: Boolean,
            createdAt: { type: Date, default: Date.now },
          })
        );

      const result = await RoleModel.findByIdAndDelete(id);
      if (!result) {
        return NextResponse.json({ error: 'Role not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: { deleted: true } }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid resourceType: must be permission or role' }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete permission/role';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
