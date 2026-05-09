import { NextRequest, NextResponse } from 'next/server';
import { getSessionsCollection } from '@/lib/sadhanaPrograms';
import mongoose from 'mongoose';

/**
 * POST /api/admin/crm/sadhana-sessions/[sessionId]/join
 * Record participant join with name and timestamp
 * Body: { name }
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Participant name is required' },
        { status: 400 }
      );
    }

    const sessionsCol = await getSessionsCollection();

    // Find session and add participant
    const result = await sessionsCol.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(params.sessionId) },
      {
        $push: {
          participants: {
            _id: new mongoose.Types.ObjectId(),
            name: name.trim(),
            joinedAt: new Date(),
          },
        },
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const participant = result.value.participants[result.value.participants.length - 1];

    return NextResponse.json({
      success: true,
      message: `${name} joined the session`,
      participant: {
        _id: participant._id.toString(),
        name: participant.name,
        joinedAt: participant.joinedAt,
      },
    });
  } catch (error: any) {
    console.error('[Session Join] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
