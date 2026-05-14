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

// GET Life Planner data for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Auth: accept either userId or email in JWT
    const identity = getAuthedIdentity(request);
    const tenantId = getTenantId(request);
    const searchParams = request.nextUrl.searchParams;
    const dataType = searchParams.get('type'); // vision, goals, tasks, etc.

    console.log(`[GET] Fetching ${dataType || 'all'} for user`, {
      hasUserId: !!identity?.userId,
      hasEmail: !!identity?.email,
      tenantId,
    });

    if (!identity?.userId && !identity?.email) {
      console.warn('[GET] Unauthorized - no userId/email found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = identity.userId;
    const email = identity.email;

    // Find user: if tenantId provided, use it for filtering (admin/CRM context)
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

    if (!query) {
      return NextResponse.json(
        { error: 'Invalid user context' },
        { status: 400 }
      );
    }

    const user = await User.findOne(query);

    if (!user) {
      console.error(`[GET] User not found`, {
        userId: userId && Types.ObjectId.isValid(userId) ? userId : undefined,
        email: email ? email.trim().toLowerCase() : undefined,
        tenantId,
      });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return specific data type or all data
    if (dataType) {
      const fieldName = `lifePlanner${dataType.charAt(0).toUpperCase()}${dataType.slice(1)}`;
      const result = user[fieldName as keyof typeof user] || [];
      return NextResponse.json({
        data: result,
      });
    }

    // Return all Life Planner data
    return NextResponse.json({
      visions: user.lifePlannerVisions || [],
      actionPlans: user.lifePlannerActionPlans || [],
      goals: user.lifePlannerGoals || [],
      tasks: user.lifePlannerTasks || [],
      todos: user.lifePlannerTodos || [],
      words: user.lifePlannerWords || [],
      reminders: user.lifePlannerReminders || [],
      healthRoutines: user.lifePlannerHealthRoutines || [],
      dailyHealthPlans: user.lifePlannerDailyHealthPlans || [],
      diamondPeople: user.lifePlannerDiamondPeople || [],
      progress: user.lifePlannerProgress || [],
    });
  } catch (error) {
    console.error('Life Planner data fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update Life Planner data for a user
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { type, data } = body;
    const identity = getAuthedIdentity(request);
    const tenantId = getTenantId(request);

    console.log(`[PUT] Updating ${type} for user`, {
      hasUserId: !!identity?.userId,
      hasEmail: !!identity?.email,
      tenantId,
    });

    if (!identity?.userId && !identity?.email) {
      console.warn('[PUT] Unauthorized - no userId/email found');
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

    const fieldName = `lifePlanner${type.charAt(0).toUpperCase()}${type.slice(1)}`;

    const userId = identity.userId;
    const email = identity.email;

    // Update user with new Life Planner data
    // If tenantId provided, use it for filtering (admin/CRM context)
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

    if (!query) {
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

    console.log(`[PUT] ✅ Updated ${type}`);
    return NextResponse.json({
      message: 'Data saved successfully',
      data: user[fieldName as keyof typeof user],
    });
  } catch (error) {
    console.error('Life Planner data update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
