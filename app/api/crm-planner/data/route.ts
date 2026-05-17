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

// GET CRM Planner data for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Auth: accept either userId or email in JWT
    const identity = getAuthedIdentity(request);
    const tenantId = getTenantId(request);
    const searchParams = request.nextUrl.searchParams;
    const dataType = searchParams.get('type'); // crm_visions, crm_goals, etc.

    console.log(`[CRM-GET] Fetching ${dataType || 'all'} for user`, {
      hasUserId: !!identity?.userId,
      hasEmail: !!identity?.email,
      tenantId,
    });

    if (!identity?.userId && !identity?.email) {
      console.warn('[CRM-GET] Unauthorized - no userId/email found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = identity.userId;
    const email = identity.email;

    console.log(`[CRM-GET] User context:`, {
      hasUserId: !!userId,
      hasEmail: !!email,
      tenantId: tenantId || 'none',
      userIdIsValidObjectId: userId && Types.ObjectId.isValid(userId),
    });

    // Find user: if tenantId provided, use it for filtering (CRM context)
    // Otherwise just filter by userId/email (regular user context)
    const query = tenantId
      ? (userId && Types.ObjectId.isValid(userId)
          ? { _id: userId, tenantId }
          : email
            ? { email: email.trim().toLowerCase(), tenantId }
            : null)
      : (userId && Types.ObjectId.isValid(userId)
          ? { _id: userId }
          : email
            ? { email: email.trim().toLowerCase() }
            : null);

    console.log(`[CRM-GET] Query:`, JSON.stringify(query));

    if (!query) {
      console.error(`[CRM-GET] Invalid user context - query is null`);
      return NextResponse.json(
        { error: 'Invalid user context' },
        { status: 400 }
      );
    }

    const user = await User.findOne(query).lean();

    if (!user) {
      console.error(`[CRM-GET] User not found`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

    const body = await request.json();
    const { type, data } = body;
    const identity = getAuthedIdentity(request);
    const tenantId = getTenantId(request);

    console.log(`[CRM-POST] Updating ${type} for user`, {
      hasUserId: !!identity?.userId,
      hasEmail: !!identity?.email,
      tenantId,
    });

    if (!identity?.userId && !identity?.email) {
      console.warn('[CRM-POST] Unauthorized - no userId/email found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: 'Type is required' },
        { status: 400 }
      );
    }

    // Convert crm_visions -> crmVisions, crm_goals -> crmGoals, etc.
    const fieldName = 'crm' + type
      .replace(/^crm_/, '')
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    const userId = identity.userId;
    const email = identity.email;

    console.log(`[CRM-POST] User context:`, {
      type,
      fieldName,
      hasUserId: !!userId,
      hasEmail: !!email,
      tenantId: tenantId || 'none',
      userIdIsValidObjectId: userId && Types.ObjectId.isValid(userId),
    });

    // Update user with new CRM Planner data
    // If tenantId provided, use it for filtering (CRM context)
    // Otherwise just filter by userId/email (regular user context)
    const query = tenantId
      ? (userId && Types.ObjectId.isValid(userId)
          ? { _id: userId, tenantId }
          : email
            ? { email: email.trim().toLowerCase(), tenantId }
            : null)
      : (userId && Types.ObjectId.isValid(userId)
          ? { _id: userId }
          : email
            ? { email: email.trim().toLowerCase() }
            : null);

    console.log(`[CRM-POST] Query:`, JSON.stringify(query));

    if (!query) {
      console.error(`[CRM-POST] Invalid user context - query is null`);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await User.findOneAndUpdate(
      query,
      {
        [fieldName]: data,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log(`[CRM-POST] ✅ Updated ${type}`);
    return NextResponse.json({
      message: 'Data saved successfully',
      data: user[fieldName as keyof typeof user],
    });
  } catch (error: any) {
    console.error('CRM Planner data update error:', error?.message || error, error?.stack);
    return NextResponse.json(
      { error: 'Internal server error', detail: error?.message },
      { status: 500 }
    );
  }
}
