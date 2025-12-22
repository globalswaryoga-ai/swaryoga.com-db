import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import {
  verifyAdminAccess,
  parsePagination,
  handleCrmError,
  formatCrmSuccess,
  buildMetadata,
  isValidObjectId,
  toObjectId,
} from '@/lib/crm-handlers';
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

const getRoleModel = () =>
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

export async function GET(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const roleId = url.searchParams.get('roleId');
    const { limit, skip } = parsePagination(request);

    await connectDB();

    const response: any = {};

    if (!type || type === 'permissions' || type === 'all') {
      const permissions = await Permission.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      const total = await Permission.countDocuments();
      response.permissions = { items: permissions, total };
    }

    if (!type || type === 'roles' || type === 'all') {
      const RoleModel = mongoose.models.Role || getRoleModel();
      let query = RoleModel.find();
      if (roleId) query = query.where('_id').equals(roleId);

      const items = await query
        .populate('permissions')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      const total = await RoleModel.countDocuments();
      response.roles = { items, total };
    }

    response.defaultRoles = Object.entries(DEFAULT_ROLES).map(([name, perms]) => ({
      name,
      permissions: perms,
    }));

    const meta = buildMetadata(skip, limit, response.permissions?.total || 0);
    return formatCrmSuccess(response, meta);
  } catch (error) {
    return handleCrmError(error, 'GET permissions');
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) throw new Error('Invalid JSON body');

    const { resourceType, name, displayName, description, permissionIds } = body;

    if (!name || !displayName) {
      throw new Error('Missing: name, displayName');
    }

    await connectDB();

    if (resourceType === 'permission') {
      const permission = await Permission.create({
        name,
        displayName,
        description: description || '',
        createdAt: new Date(),
      });
      return formatCrmSuccess({ permission }, {});
    } else if (resourceType === 'role') {
      const RoleModel = mongoose.models.Role || getRoleModel();
      const role = await RoleModel.create({
        name,
        displayName,
        description: description || '',
        permissions: permissionIds || [],
        isDefault: false,
        createdAt: new Date(),
      });
      const populated = await role.populate('permissions');
      return formatCrmSuccess({ role: populated }, {});
    } else {
      throw new Error('Invalid resourceType: must be permission or role');
    }
  } catch (error) {
    return handleCrmError(error, 'POST permissions');
  }
}

export async function PUT(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const body = await request.json().catch(() => null);
    if (!body) throw new Error('Invalid JSON body');

    const { resourceType, id, name, displayName, description, permissionIds } = body;
    if (!id) throw new Error('Missing: id');

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
      if (!permission) throw new Error('Permission not found');
      return formatCrmSuccess({ permission }, {});
    } else if (resourceType === 'role') {
      const RoleModel = mongoose.models.Role || getRoleModel();
      const updateData: any = {};
      if (name) updateData.name = name;
      if (displayName) updateData.displayName = displayName;
      if (description !== undefined) updateData.description = description;
      if (permissionIds) updateData.permissions = permissionIds;
      updateData.updatedAt = new Date();

      const role = await RoleModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).populate(
        'permissions'
      );
      if (!role) throw new Error('Role not found');
      return formatCrmSuccess({ role }, {});
    } else {
      throw new Error('Invalid resourceType: must be permission or role');
    }
  } catch (error) {
    return handleCrmError(error, 'PUT permissions');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyAdminAccess(request);
    const url = new URL(request.url);
    const resourceType = url.searchParams.get('resourceType');
    const id = url.searchParams.get('id');

    if (!id || !resourceType) throw new Error('Missing: id, resourceType');

    await connectDB();

    if (resourceType === 'permission') {
      const result = await Permission.findByIdAndDelete(id);
      if (!result) throw new Error('Permission not found');
      return formatCrmSuccess({ deleted: true }, {});
    } else if (resourceType === 'role') {
      const RoleModel = mongoose.models.Role || getRoleModel();
      const result = await RoleModel.findByIdAndDelete(id);
      if (!result) throw new Error('Role not found');
      return formatCrmSuccess({ deleted: true }, {});
    } else {
      throw new Error('Invalid resourceType: must be permission or role');
    }
  } catch (error) {
    return handleCrmError(error, 'DELETE permissions');
  }
}
