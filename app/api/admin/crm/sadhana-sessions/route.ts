import { NextRequest, NextResponse } from 'next/server';
import { getSessionsCollection } from '@/lib/sadhanaPrograms';
import mongoose from 'mongoose';

/**
 * GET /api/admin/crm/sadhana-sessions
 * Get sessions for a program and date
 * Query: programId, date (YYYY-MM-DD)
 *
 * POST /api/admin/crm/sadhana-sessions
 * Create/Initialize sessions for a program at specified time slots
 * Body: { programId, programSlug, date, timeSlots: ["06:00", "07:00", "18:00", "19:00"] }
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (!programId || !date) {
      return NextResponse.json(
        { error: 'Missing programId or date' },
        { status: 400 }
      );
    }

    const sessionsCol = await getSessionsCollection();
    const sessions = await sessionsCol
      .find({ programId, date })
      .sort({ timeSlot: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      sessions: sessions.map((s: any) => ({
        _id: s._id.toString(),
        programId: s.programId,
        date: s.date,
        timeSlot: s.timeSlot,
        participantCount: s.participants?.length || 0,
        participants: (s.participants || []).map((p: any) => ({
          _id: p._id?.toString(),
          name: p.name,
          joinedAt: p.joinedAt,
          leftAt: p.leftAt,
          durationMinutes: p.durationMinutes,
        })),
        createdAt: s.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('[Sadhana Sessions GET] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { programId, programSlug, date, timeSlots } = body;

    if (!programId || !date || !timeSlots || !Array.isArray(timeSlots)) {
      return NextResponse.json(
        { error: 'Missing required fields: programId, date, timeSlots[]' },
        { status: 400 }
      );
    }

    const sessionsCol = await getSessionsCollection();
    const createdSessions = [];

    for (const timeSlot of timeSlots) {
      try {
        const result = await sessionsCol.updateOne(
          { programId, date, timeSlot },
          {
            $setOnInsert: {
              programId,
              programSlug: programSlug || 'unknown',
              date,
              timeSlot,
              participants: [],
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );

        if (result.upsertedId || result.matchedCount > 0) {
          createdSessions.push({ date, timeSlot });
        }
      } catch (err: any) {
        // Ignore duplicate key errors
        if (!err.message.includes('E11000')) throw err;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created/verified ${createdSessions.length} sessions`,
      sessions: createdSessions,
    });
  } catch (error: any) {
    console.error('[Sadhana Sessions POST] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
