import { NextRequest, NextResponse } from 'next/server';
import { connectDB, User } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET Life Planner data for a user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get email from query params
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    const dataType = searchParams.get('type'); // vision, goals, tasks, etc.

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
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
    const { email, type, data } = body;

    if (!email || !type) {
      return NextResponse.json(
        { error: 'Email and type are required' },
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
