/**
 * GET /api/sadhana/live/[slug]/participants-by-date?date=2026-05-05
 *
 * Fetch all participants who joined a specific date's session
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import { getProgramsDb } from '@/lib/sadhanaPrograms';
import mongoose from 'mongoose';

async function getDb() {
  await connectDB();
  return mongoose.connection.useDb('swaryoga_admin_crm');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date'); // YYYY-MM-DD format

    if (!dateStr) {
      return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
    }

    // Parse date and get the timezone from program
    const db = await getDb();
    const programsDb = await getProgramsDb();
    const programsCol = programsDb.collection('sadhana_programs');
    const program = await programsCol.findOne({ slug: params.slug });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const timezone = program.timezone || 'Asia/Kolkata';
    const timeSlots = program.timeSlots || [];

    // Calculate start and end of day in UTC based on program timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const today = new Date();
    const todayStr = formatter.format(today);

    // Parse the requested date
    const [reqYear, reqMonth, reqDay] = dateStr.split('-').map(Number);
    const reqDate = new Date(reqYear, reqMonth - 1, reqDay);

    // Get start and end timestamps for the requested date in program timezone
    const dateStart = new Date(`${dateStr}T00:00:00`);
    const dateEnd = new Date(`${dateStr}T23:59:59`);

    // Convert to UTC timestamps for querying
    const startMs = dateStart.getTime();
    const endMs = dateEnd.getTime();
    const startSeconds = Math.floor(startMs / 1000);
    const endSeconds = Math.floor(endMs / 1000);

    const joinHistoryCol = db.collection('sadhana_join_history');
    const participants = await joinHistoryCol
      .find({
        programSlug: params.slug,
        joinedAt: {
          $gte: new Date(startMs),
          $lte: new Date(endMs),
        },
      })
      .sort({ joinedAt: 1 })
      .lean()
      .toArray();

    // Group by time slot
    const participantsBySlot: Record<string, any[]> = {};
    const unlistedParticipants: any[] = [];

    participants.forEach((p: any) => {
      const joinTime = new Date(p.joinedAt);
      const joinHour = String(joinTime.getUTCHours()).padStart(2, '0');
      const joinMin = String(joinTime.getUTCMinutes()).padStart(2, '0');
      const joinTimeSlot = `${joinHour}:${joinMin}`;

      // Calculate duration if left time is available
      let duration: number | null = null;
      if (p.leftAt) {
        const leaveTime = new Date(p.leftAt);
        duration = Math.round((leaveTime.getTime() - joinTime.getTime()) / (1000 * 60)); // in minutes
      }

      // Check if matches any of the program's time slots
      const matchedSlot = timeSlots.find((slot: string) => {
        const [slotHour, slotMin] = slot.split(':');
        return slotHour === joinHour && slotMin === joinMin;
      });

      const participantData = {
        name: p.name,
        joinedAt: p.joinedAt,
        joinTime: joinTime.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        duration,
      };

      if (matchedSlot) {
        if (!participantsBySlot[matchedSlot]) {
          participantsBySlot[matchedSlot] = [];
        }
        participantsBySlot[matchedSlot].push(participantData);
      } else {
        unlistedParticipants.push(participantData);
      }
    });

    return NextResponse.json({
      success: true,
      date: dateStr,
      programSlug: params.slug,
      programName: program.name,
      totalParticipants: participants.length,
      participantsBySlot,
      unlistedParticipants,
      timeSlots,
    });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana/live/[slug]/participants-by-date');
  }
}
