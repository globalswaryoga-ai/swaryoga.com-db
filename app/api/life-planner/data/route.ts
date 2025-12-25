import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

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

// GET Life Planner data for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Auth: accept either userId or email in JWT
    const identity = getAuthedIdentity(request);
    const searchParams = request.nextUrl.searchParams;
    const dataType = searchParams.get('type'); // vision, goals, tasks, etc.

    console.log(`[GET] Fetching ${dataType || 'all'} for user`, {
      hasUserId: !!identity?.userId,
      hasEmail: !!identity?.email,
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

    // Find user (prefer userId when available)
    const user = userId && Types.ObjectId.isValid(userId)
      ? await User.findById(userId)
      : email
        ? await User.findOne({ email: email.trim().toLowerCase() })
        : null;

    if (!user) {
      console.error(`[GET] User not found`, {
        userId: userId && Types.ObjectId.isValid(userId) ? userId : undefined,
        email: email ? email.trim().toLowerCase() : undefined,
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
      console.log(`[GET] ✅ Returned ${dataType}: ${Array.isArray(result) ? result.length : '?'} items`);
      return NextResponse.json({
        data: result,
      });
    }

    // Return all Life Planner data
    console.log(`[GET] ✅ Returned all data`);
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
      { error: 'Internal server error', details: String(error) },
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

    console.log(`[PUT] Updating ${type} for user`, {
      hasUserId: !!identity?.userId,
      hasEmail: !!identity?.email,
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
    console.log(`[PUT] Field name: ${fieldName}, data length: ${Array.isArray(data) ? data.length : 'not array'}`);

    const userId = identity.userId;
    const email = identity.email;

    // Update user with new Life Planner data
    const query = userId && Types.ObjectId.isValid(userId)
      ? { _id: userId }
      : email
        ? { email: email.trim().toLowerCase() }
        : null;

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
      console.error(`[PUT] User not found`, {
        userId: userId && Types.ObjectId.isValid(userId) ? userId : undefined,
        email: email ? email.trim().toLowerCase() : undefined,
      });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log(`[PUT] ✅ Successfully updated ${type}`);
    return NextResponse.json({
      message: 'Data saved successfully',
      data: user[fieldName as keyof typeof user],
    });
  } catch (error) {
    console.error('Life Planner data update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
