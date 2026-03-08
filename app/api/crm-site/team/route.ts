import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

/**
 * GET /api/crm-site/team
 * List team members for a tenant
 * 
 * POST /api/crm-site/team
 * Invite a new team member
 * 
 * PATCH /api/crm-site/team
 * Update team member role
 * 
 * DELETE /api/crm-site/team
 * Remove a team member
 */

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'active' | 'invited' | 'suspended';
  permissions: string[];
  invitedAt?: Date;
  joinedAt?: Date;
  lastActiveAt?: Date;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ['all'],
  admin: ['leads:read', 'leads:write', 'leads:delete', 'messages:read', 'messages:write', 'broadcast', 'analytics', 'team:manage', 'settings:read', 'settings:write'],
  editor: ['leads:read', 'leads:write', 'messages:read', 'messages:write', 'broadcast', 'analytics'],
  viewer: ['leads:read', 'messages:read', 'analytics'],
};

const USER_LIMITS: Record<string, number> = {
  free: 1,
  basic: 2,
  starter: 3,
  growth: 10,
  professional: 999,
};

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const url = new URL(request.url);
    const tenantSlug = url.searchParams.get('tenant') || (decoded as any).tenantSlug;

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Get tenant info for limits
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });
    const userLimit = USER_LIMITS[tenant?.plan || 'free'] || 1;

    // Get team members
    const members = await crmDb.collection('tenant_team').find({ tenantSlug }).toArray();

    // Get pending invites
    const invites = await crmDb.collection('tenant_invites').find({
      tenantSlug,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).toArray();

    return NextResponse.json({
      members: members.map(m => ({
        id: m._id.toString(),
        email: m.email,
        name: m.name || m.email.split('@')[0],
        role: m.role,
        status: m.status,
        permissions: m.permissions || ROLE_PERMISSIONS[m.role] || [],
        joinedAt: m.joinedAt,
        lastActiveAt: m.lastActiveAt,
      })),
      invites: invites.map(i => ({
        id: i._id.toString(),
        email: i.email,
        role: i.role,
        invitedAt: i.createdAt,
        expiresAt: i.expiresAt,
      })),
      userLimit,
      currentCount: members.length + invites.length,
      plan: tenant?.plan || 'free',
    });
  } catch (err: any) {
    console.error('Team GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch team' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantSlug, email, role = 'viewer', name } = body;

    if (!tenantSlug || !email) {
      return NextResponse.json({ error: 'tenantSlug and email required' }, { status: 400 });
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    // Check tenant limits
    const tenant = await crmDb.collection('crm_tenants').findOne({ slug: tenantSlug });
    const userLimit = USER_LIMITS[tenant?.plan || 'free'] || 1;

    const memberCount = await crmDb.collection('tenant_team').countDocuments({ tenantSlug });
    const inviteCount = await crmDb.collection('tenant_invites').countDocuments({
      tenantSlug,
      status: 'pending',
    });

    if (memberCount + inviteCount >= userLimit) {
      return NextResponse.json(
        { error: `User limit reached (${userLimit}). Upgrade your plan to add more team members.` },
        { status: 400 }
      );
    }

    // Check if already a member or invited
    const existingMember = await crmDb.collection('tenant_team').findOne({
      tenantSlug,
      email: email.toLowerCase(),
    });
    if (existingMember) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 400 });
    }

    const existingInvite = await crmDb.collection('tenant_invites').findOne({
      tenantSlug,
      email: email.toLowerCase(),
      status: 'pending',
    });
    if (existingInvite) {
      return NextResponse.json({ error: 'Invite already sent to this email' }, { status: 400 });
    }

    // Create invite
    const inviteToken = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    await crmDb.collection('tenant_invites').insertOne({
      tenantSlug,
      email: email.toLowerCase(),
      name: name || '',
      role,
      permissions: ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer,
      inviteToken,
      status: 'pending',
      invitedBy: (decoded as any).userId || (decoded as any).email,
      createdAt: new Date(),
      expiresAt,
    });

    // TODO: Send invite email
    const inviteUrl = `https://crm.swaryoga.com/invite/${inviteToken}`;
    console.log(`📧 Invite URL for ${email}: ${inviteUrl}`);

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      inviteUrl, // For testing; remove in production
    });
  } catch (err: any) {
    console.error('Team POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to invite team member' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantSlug, memberId, role, permissions } = body;

    if (!tenantSlug || !memberId) {
      return NextResponse.json({ error: 'tenantSlug and memberId required' }, { status: 400 });
    }

    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const { ObjectId } = mongoose.Types;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    const updateData: any = { updatedAt: new Date() };
    if (role) {
      updateData.role = role;
      updateData.permissions = permissions || ROLE_PERMISSIONS[role] || [];
    }
    if (permissions) {
      updateData.permissions = permissions;
    }

    await crmDb.collection('tenant_team').updateOne(
      { _id: new ObjectId(memberId), tenantSlug },
      { $set: updateData }
    );

    return NextResponse.json({ success: true, message: 'Team member updated' });
  } catch (err: any) {
    console.error('Team PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update team member' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantSlug, memberId, inviteId } = body;

    if (!tenantSlug || (!memberId && !inviteId)) {
      return NextResponse.json({ error: 'tenantSlug and memberId or inviteId required' }, { status: 400 });
    }

    await connectDB();

    const mongoose = (await import('mongoose')).default;
    const { ObjectId } = mongoose.Types;
    const crmDb = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

    if (inviteId) {
      // Cancel invite
      await crmDb.collection('tenant_invites').deleteOne({
        _id: new ObjectId(inviteId),
        tenantSlug,
      });
      return NextResponse.json({ success: true, message: 'Invite cancelled' });
    }

    if (memberId) {
      // Check if trying to remove owner
      const member = await crmDb.collection('tenant_team').findOne({
        _id: new ObjectId(memberId),
        tenantSlug,
      });

      if (member?.role === 'owner') {
        return NextResponse.json({ error: 'Cannot remove the owner' }, { status: 400 });
      }

      await crmDb.collection('tenant_team').deleteOne({
        _id: new ObjectId(memberId),
        tenantSlug,
      });
      return NextResponse.json({ success: true, message: 'Team member removed' });
    }

    return NextResponse.json({ error: 'Nothing to delete' }, { status: 400 });
  } catch (err: any) {
    console.error('Team DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to remove team member' }, { status: 500 });
  }
}
