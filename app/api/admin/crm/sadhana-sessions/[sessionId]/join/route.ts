import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

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
    const body = await request.json().catch(() => ({}));
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Participant name is required' },
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
    const newParticipant = {
      _id: `part_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      joinedAt: new Date().toISOString(),
    };
    participants.push(newParticipant);
    data.participants = participants;

    await bunnyExecute({
      sql: 'UPDATE sadhana_sessions_sql SET data_json = ?, updated_at = ? WHERE document_id = ?',
      args: [JSON.stringify(data), new Date().toISOString(), sessionId],
    });

    return NextResponse.json({
      success: true,
      message: `${name} joined the session`,
      participant: newParticipant,
    });
  } catch (error: any) {
    console.error('[Sadhana Join] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to join' }, { status: 500 });
  }
}
