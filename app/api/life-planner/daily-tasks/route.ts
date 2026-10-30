/**
 * Daily Tasks & Sadhana API - Bunny Database Backend
 * Handles persistent storage of workshop tasks and sadhana for specific days
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getBunnyDailyTasks, saveBunnyDailyTasks } from '@/lib/bunnyPlannerRepository';

export const dynamic = 'force-dynamic';

function getAuthedOwnerId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const userId = payload.userId || (payload as any)._id || (payload as any).id;
  const username = (payload as any).username ? String((payload as any).username).trim().toLowerCase() : '';

  return email || (userId ? String(userId) : '') || username || null;
}

export async function GET(request: NextRequest) {
  try {
    const ownerId = getAuthedOwnerId(request);
    if (!ownerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const type = searchParams.get('type'); // 'workshopTasks' or 'sadhana' or 'all'

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const tasksForDate = await getBunnyDailyTasks(ownerId, date);

    if (type === 'workshopTasks') {
      return NextResponse.json(
        { success: true, data: tasksForDate.workshopTasks || [] },
        { status: 200 }
      );
    }

    if (type === 'sadhana') {
      return NextResponse.json(
        { success: true, data: tasksForDate.sadhana || null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: tasksForDate,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[BunnyDailyTasks GET error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = getAuthedOwnerId(request);
    if (!ownerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, workshopTasks, sadhana } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const saved = await saveBunnyDailyTasks(ownerId, date, {
      ...(workshopTasks !== undefined ? { workshopTasks } : {}),
      ...(sadhana !== undefined ? { sadhana } : {}),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Tasks saved to Bunny Database successfully',
        data: saved,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[BunnyDailyTasks POST error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
