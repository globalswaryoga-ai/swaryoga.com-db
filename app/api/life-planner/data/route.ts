import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getAuthedEmail(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  const payload = verifyToken(token);
  return payload?.email ?? null;
}

// GET Life Planner data for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Auth: derive email from token
    const email = getAuthedEmail(request);
    const searchParams = request.nextUrl.searchParams;
    const dataType = searchParams.get('type'); // vision, goals, tasks, etc.

    if (!email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find user
  const user = await User.findOne({ email: email.trim() });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return specific data type or all data
    if (dataType) {
      const fieldName = `lifePlanner${dataType.charAt(0).toUpperCase()}${dataType.slice(1)}`;
      return NextResponse.json({
        data: user[fieldName as keyof typeof user] || [],
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
    const email = getAuthedEmail(request);

    if (!email) {
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

    // Update user with new Life Planner data
    const user = await User.findOneAndUpdate(
      { email: email.trim() },
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
