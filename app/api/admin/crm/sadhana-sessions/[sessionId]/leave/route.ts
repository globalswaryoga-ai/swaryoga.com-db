import { NextRequest, NextResponse } from 'next/server';
import { getSessionsCollection } from '@/lib/sadhanaPrograms';
import mongoose from 'mongoose';

/**
 * POST /api/admin/crm/sadhana-sessions/[sessionId]/leave
 * Record participant logout and calculate duration
 * Body: { participantId }
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const body = await request.json();
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      );
    }

    const sessionsCol = await getSessionsCollection();

    // Find session
    const session = await sessionsCol.findOne({
      _id: new mongoose.Types.ObjectId(params.sessionId),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Find participant
    const participant = session.participants.find(
      (p: any) => p._id.toString() === participantId
    );

    if (!participant) {
      return NextResponse.json(
        { error: 'Participant not found in session' },
        { status: 404 }
      );
    }

    if (participant.leftAt) {
      return NextResponse.json(
        { error: 'Participant already left the session' },
        { status: 400 }
      );
    }

    // Calculate duration in minutes
    const now = new Date();
    const durationMs = now.getTime() - new Date(participant.joinedAt).getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    // Update participant with logout time and duration
    const result = await sessionsCol.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(params.sessionId),
        'participants._id': new mongoose.Types.ObjectId(participantId),
      },
      {
        $set: {
          'participants.$[p].leftAt': now,
          'participants.$[p].durationMinutes': durationMinutes,
        },
      },
      {
        arrayFilters: [{ 'p._id': new mongoose.Types.ObjectId(participantId) }],
        returnDocument: 'after',
      }
    );

    if (!result.value) {
      return NextResponse.json(
        { error: 'Failed to update participant' },
        { status: 500 }
      );
    }

    const updatedParticipant = result.value.participants.find(
      (p: any) => p._id.toString() === participantId
    );

    return NextResponse.json({
      success: true,
      message: `${participant.name} left the session`,
      participant: {
        _id: updatedParticipant._id.toString(),
        name: updatedParticipant.name,
        joinedAt: updatedParticipant.joinedAt,
        leftAt: updatedParticipant.leftAt,
        durationMinutes: updatedParticipant.durationMinutes,
      },
    });
  } catch (error: any) {
    console.error('[Session Leave] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
