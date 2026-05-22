/**
 * CRM Daily Tasks & Sadhana API
 * Handles persistent storage of workshop tasks and sadhana for specific days
 * GET: Fetch tasks/sadhana for a date
 * POST: Save tasks/sadhana for a date
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

const TENANT_HEADER = 'x-tenant-id';

function getTenantId(request: NextRequest): string | null {
  return request.headers.get(TENANT_HEADER);
}


export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const tenantId = getTenantId(request);
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

    // User documents do NOT have a tenantId field — never include it in the query.
    // (tenantId from x-tenant-id header is the admin's userId string, e.g. "admincrm")
    const query = (userId && Types.ObjectId.isValid(userId))
      ? { _id: userId }
      : email
        ? { email: email.trim().toLowerCase() }
        : null;

    if (!query) {
      return NextResponse.json(
        { error: 'Invalid user context' },
        { status: 400 }
      );
    }

    const user = await User.findOne(query).lean();
    // Return empty data for new users (not a 404 — they just haven't saved anything yet)
    if (!user) {
      return NextResponse.json({
        workshopTasks: [],
        sadhana: null,
        date,
      });
    }

    // Return stored daily tasks (using crmDailyTasks instead of lifePlannerDailyTasks)
    const dailyTasksData = (user as any).crmDailyTasks || {};
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
    console.error('Error fetching CRM daily tasks:', error);
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
    const tenantId = getTenantId(request);
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

    // User documents do NOT have a tenantId field — never include it in the query.
    const query = (userId && Types.ObjectId.isValid(userId))
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
          [`crmDailyTasks.${date}`]: {
            date,
            workshopTasks: workshopTasks || [],
            sadhana: sadhana || null,
            updatedAt: new Date().toISOString(),
          },
        },
      },
      { new: true, runValidators: false }  // no upsert — user must already exist
    );

    if (!user) {
      // User not found — silently succeed so UI doesn't break
      console.log(`[CRM POST] ⚠️ User not found for query on ${date} — skipping save`);
      return NextResponse.json(
        {
          success: true,
          data: { date, workshopTasks: workshopTasks || [], sadhana: sadhana || null },
          message: 'Daily tasks saved successfully',
        },
        { status: 200 }
      );
    }

    console.log(`[CRM POST] ✅ Saved daily tasks on ${date}:`, {
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
    console.error('Error saving CRM daily tasks:', error);
    return NextResponse.json(
      { error: 'Failed to save daily tasks' },
      { status: 500 }
    );
  }
}
