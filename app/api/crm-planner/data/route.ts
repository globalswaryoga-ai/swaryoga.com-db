import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

const TENANT_HEADER = 'x-tenant-id';

function getAuthedIdentity(request: NextRequest): { userId?: string; email?: string } | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return {
    userId: payload.userId,
    email: payload.email,
  };
}

function getTenantId(request: NextRequest): string | null {
  return request.headers.get(TENANT_HEADER);
}

// Empty data structure returned when user not found
const EMPTY_DATA = {
  data: [],
  visions: [], actionPlans: [], goals: [], tasks: [],
  todos: [], words: [], reminders: [], healthRoutines: [],
  dailyHealthPlans: [], diamondPeople: [], progress: [],
};

// GET CRM Planner data for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Auth: accept userId/email in JWT, also handle admin tokens (isAdmin:true)
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { verifyToken: vt } = await import('@/lib/auth');
    const payload = vt(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const tenantId = getTenantId(request);
    const searchParams = request.nextUrl.searchParams;
    const dataType = searchParams.get('type'); // crm_visions, crm_goals, etc.

    // Extract user identity: try userId, email, or username (admin fallback)
    const userId = payload.userId || payload._id || payload.id;
    const email = payload.email;
    const adminUsername = payload.username;
    const isAdmin = payload.isAdmin;

    // Require at least one identifier
    if (!userId && !email && !adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query with fallbacks: try userId first, then email, then admin username
    const orConditions: any[] = [];
    if (userId && Types.ObjectId.isValid(String(userId))) {
      orConditions.push(tenantId ? { _id: userId, tenantId } : { _id: userId });
    }
    if (email) {
      orConditions.push(tenantId
        ? { email: email.trim().toLowerCase(), tenantId }
        : { email: email.trim().toLowerCase() });
    }
    // For admin users, look for a user matching their admin email or username
    if (isAdmin && adminUsername) {
      orConditions.push({ adminUsername });
      // Also check if admin has a user email set in their profile
      const adminEmail = process.env.ADMIN_EMAIL || `${adminUsername}@admin.swaryoga.com`;
      orConditions.push({ email: adminEmail.toLowerCase() });
    }

    if (orConditions.length === 0) {
      return NextResponse.json({ error: 'Invalid user context' }, { status: 400 });
    }

    const query = orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
    let user = await User.findOne(query).lean();

    // If admin user not found, return empty data (admin's planner starts empty)
    if (!user) {
      console.warn(`[CRM-GET] User not found for query, returning empty data`);
      if (dataType) {
        return NextResponse.json({ data: [] });
      }
      return NextResponse.json(EMPTY_DATA);
    }

    const doc = user as Record<string, any>;

    // Return specific data type or all data
    if (dataType) {
      // Convert crm_visions -> crmVisions, crm_actionPlans -> crmActionPlans, etc.
      const fieldName = 'crm' + dataType
        .replace(/^crm_/, '')
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');

      const result = Array.isArray(doc[fieldName]) ? doc[fieldName] : [];
      return NextResponse.json({ data: result });
    }

    // Return all CRM Planner data
    return NextResponse.json({
      visions: doc.crmVisions || [],
      actionPlans: doc.crmActionPlans || [],
      goals: doc.crmGoals || [],
      tasks: doc.crmTasks || [],
      todos: doc.crmTodos || [],
      words: doc.crmWords || [],
      reminders: doc.crmReminders || [],
      healthRoutines: doc.crmHealthRoutines || [],
      dailyHealthPlans: doc.crmDailyHealthPlans || [],
      diamondPeople: doc.crmDiamondPeople || [],
      progress: doc.crmProgress || [],
    });
  } catch (error: any) {
    console.error('CRM Planner data fetch error:', error?.message || error, error?.stack);
    return NextResponse.json(
      { error: 'Internal server error', detail: error?.message },
      { status: 500 }
    );
  }
}

// POST - Update CRM Planner data for a user
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { verifyToken: vt } = await import('@/lib/auth');
    const payload = vt(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;
    const tenantId = getTenantId(request);

    if (!type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 });
    }

    // Convert crm_visions -> crmVisions, crm_goals -> crmGoals, etc.
    const fieldName = 'crm' + type
      .replace(/^crm_/, '')
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    const userId = payload.userId || payload._id || payload.id;
    const email = payload.email;
    const adminUsername = payload.username;
    const isAdmin = payload.isAdmin;

    if (!userId && !email && !adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query with all possible identifiers
    const orConditions: any[] = [];
    if (userId && Types.ObjectId.isValid(String(userId))) {
      orConditions.push(tenantId ? { _id: userId, tenantId } : { _id: userId });
    }
    if (email) {
      orConditions.push(tenantId
        ? { email: email.trim().toLowerCase(), tenantId }
        : { email: email.trim().toLowerCase() });
    }
    if (isAdmin && adminUsername) {
      orConditions.push({ adminUsername });
      const adminEmail = process.env.ADMIN_EMAIL || `${adminUsername}@admin.swaryoga.com`;
      orConditions.push({ email: adminEmail.toLowerCase() });
    }

    if (orConditions.length === 0) {
      return NextResponse.json({ error: 'Invalid user context' }, { status: 400 });
    }

    const query = orConditions.length === 1 ? orConditions[0] : { $or: orConditions };

    // Try to update existing user, or upsert for admin
    let user;
    if (isAdmin && adminUsername) {
      // For admin users, upsert so they can save data even if no user record exists
      const adminEmail = (process.env.ADMIN_EMAIL || `${adminUsername}@admin.swaryoga.com`).toLowerCase();
      user = await User.findOneAndUpdate(
        { $or: [{ adminUsername }, { email: adminEmail }] },
        {
          $set: { [fieldName]: data, updatedAt: new Date() },
          $setOnInsert: { email: adminEmail, adminUsername, name: adminUsername, createdAt: new Date() },
        },
        { new: true, upsert: true }
      );
    } else {
      user = await User.findOneAndUpdate(
        query,
        { $set: { [fieldName]: data, updatedAt: new Date() } },
        { new: true }
      );
    }

    if (!user) {
      // Return success with empty data instead of 404
      console.warn(`[CRM-POST] User not found, data not saved`);
      return NextResponse.json({ message: 'No user found to update', data: [] });
    }

    console.log(`[CRM-POST] ✅ Updated ${type}`);
    return NextResponse.json({
      message: 'Data saved successfully',
      data: (user as any)[fieldName],
    });
  } catch (error: any) {
    console.error('CRM Planner data update error:', error?.message || error, error?.stack);
    return NextResponse.json(
      { error: 'Internal server error', detail: error?.message },
      { status: 500 }
    );
  }
}
