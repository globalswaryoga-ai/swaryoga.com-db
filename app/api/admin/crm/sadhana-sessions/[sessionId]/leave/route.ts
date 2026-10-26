import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

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
    const body = await request.json().catch(() => ({}));
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      );
    }

    const sessionId = params.sessionId;
    const existing = await bunnyExecute({
      sql: 'SELECT document_id, data_json FROM sadhana_sessions_sql WHERE document_id = ? LIMIT 1',
      args: [sessionId],
    }).catch(() => ({ rows: [] }));

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const data = existing.rows[0].data_json ? JSON.parse(String(existing.rows[0].data_json)) : {};
    const participants = Array.isArray(data.participants) ? data.participants : [];

    const participant = participants.find(
      (p: any) => String(p._id) === String(participantId)
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

    const now = new Date();
    const joinedAt = new Date(participant.joinedAt);
    const durationMinutes = Math.max(1, Math.round((now.getTime() - joinedAt.getTime()) / (1000 * 60)));

    participant.leftAt = now.toISOString();
    participant.durationMinutes = durationMinutes;
    data.participants = participants;

    await bunnyExecute({
      sql: 'UPDATE sadhana_sessions_sql SET data_json = ?, updated_at = ? WHERE document_id = ?',
      args: [JSON.stringify(data), now.toISOString(), sessionId],
    });

    return NextResponse.json({
      success: true,
      message: `${participant.name} left the session`,
      durationMinutes,
      participant,
    });
  } catch (error: any) {
    console.error('[Sadhana Leave] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to record leave' }, { status: 500 });
  }
}
