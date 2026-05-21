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

const EMPTY_LIFE_DATA = {
  data: [],
  visions: [], goals: [], tasks: [], todos: [], words: [],
  reminders: [], healthRoutines: [], diamondPeople: [], progress: [],
};

// GET Life Planner data for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const tenantId = getTenantId(request);
    const searchParams = request.nextUrl.searchParams;
    const dataType = searchParams.get('type');

    // Accept all token types: userId, email, username (admin), isAdmin flag
    const userId = payload.userId || payload._id || payload.id;
    const email = payload.email;
    const isAdmin = payload.isAdmin;
    const adminUsername = payload.username;

    if (!userId && !email && !adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build OR query covering all possible identifiers
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
      const adminEmail = (process.env.ADMIN_EMAIL || `${adminUsername}@admin.swaryoga.com`).toLowerCase();
      orConditions.push({ email: adminEmail });
    }

    if (orConditions.length === 0) {
      return NextResponse.json({ error: 'Invalid user context' }, { status: 400 });
    }

    const query = orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
    const user = await User.findOne(query);

    if (!user) {
      // Return empty data gracefully instead of 404
      console.warn('[Life Planner GET] User not found, returning empty data');
      if (dataType) return NextResponse.json({ data: [] });
      return NextResponse.json(EMPTY_LIFE_DATA);
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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { type, data } = body;
    const tenantId = getTenantId(request);

    if (!type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 });
    }

    const fieldName = `lifePlanner${type.charAt(0).toUpperCase()}${type.slice(1)}`;

    const userId = payload.userId || payload._id || payload.id;
    const email = payload.email;
    const isAdmin = payload.isAdmin;
    const adminUsername = payload.username;

    if (!userId && !email && !adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      const adminEmail = (process.env.ADMIN_EMAIL || `${adminUsername}@admin.swaryoga.com`).toLowerCase();
      orConditions.push({ email: adminEmail });
    }

    if (orConditions.length === 0) {
      return NextResponse.json({ error: 'Invalid user context' }, { status: 400 });
    }

    const query = orConditions.length === 1 ? orConditions[0] : { $or: orConditions };

    let user;
    if (isAdmin && adminUsername) {
      // Upsert for admin users
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
      console.warn('[Life Planner PUT] User not found, data not saved');
      return NextResponse.json({ message: 'No user found to update', data: [] });
    }

    return NextResponse.json({
      message: 'Data saved successfully',
      data: (user as any)[fieldName],
    });
  } catch (error) {
    console.error('Life Planner data update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
