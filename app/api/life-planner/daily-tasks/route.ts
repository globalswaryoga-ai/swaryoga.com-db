/**
 * Daily Tasks & Sadhana API
 * Handles persistent storage of workshop tasks and sadhana for specific days
 * GET: Fetch tasks/sadhana for a date
 * POST: Save tasks/sadhana for a date
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.userId && !decoded?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.userId;
    const email = decoded.email;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const type = searchParams.get('type'); // 'workshopTasks' or 'sadhana' or 'all'

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const user = userId && Types.ObjectId.isValid(userId)
      ? await User.findById(userId).lean()
      : email
        ? await User.findOne({ email: email.trim().toLowerCase() }).lean()
        : null;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return stored daily tasks
    const dailyTasksData = (user as any).lifePlannerDailyTasks || {};
    const tasksForDate = dailyTasksData[date] || {
      workshopTasks: [],
      sadhana: null,
      date,
    };

    if (type === 'workshopTasks') {
      return NextResponse.json(
        { success: true, data: tasksForDate.workshopTasks || [] },
        { status: 200 }
      );
    } else if (type === 'sadhana') {
      return NextResponse.json(
        { success: true, data: tasksForDate.sadhana || null },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { success: true, data: tasksForDate },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Error fetching daily tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.userId && !decoded?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = decoded.userId;
    const email = decoded.email;

    const body = await request.json();
    const { date, workshopTasks, sadhana } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Update user's daily tasks
    const query = userId && Types.ObjectId.isValid(userId)
      ? { _id: userId }
      : email
        ? { email: email.trim().toLowerCase() }
        : null;

    if (!query) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findOneAndUpdate(
      query,
      {
        $set: {
          [`lifePlannerDailyTasks.${date}`]: {
            date,
            workshopTasks: workshopTasks || [],
            sadhana: sadhana || null,
            updatedAt: new Date().toISOString(),
          },
        },
      },
      { new: true, runValidators: false }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`[POST] ✅ Saved daily tasks on ${date}:`, {
      hasUserId: !!(userId && Types.ObjectId.isValid(userId)),
      hasEmail: !!email,
      workshopTasksCount: (workshopTasks || []).length,
      hasSadhana: !!sadhana,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          date,
          workshopTasks: workshopTasks || [],
          sadhana: sadhana || null,
        },
        message: 'Daily tasks saved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving daily tasks:', error);
    return NextResponse.json(
      { error: 'Failed to save daily tasks' },
      { status: 500 }
    );
  }
}
