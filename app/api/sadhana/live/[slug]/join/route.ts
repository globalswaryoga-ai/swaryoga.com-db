import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initSadhanaBunnySchema } from '@/lib/bunnySadhanaRepository';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { sessionId, name } = await request.json();
    if (!sessionId || !name) {
      return NextResponse.json({ error: 'sessionId and name required' }, { status: 400 });
    }

    await initSadhanaBunnySchema();
    const now = new Date().toISOString();
    const cleanName = String(name).slice(0, 50);

    const id1 = require('crypto').randomUUID();
    const existingParticipant = await bunnyExecute({
      sql: `SELECT id FROM sadhana_live_participants_sql WHERE session_id = ? AND program_slug = ?`,
      args: [sessionId, params.slug]
    });
    
    if (existingParticipant.rows && existingParticipant.rows.length > 0) {
      await bunnyExecute({
        sql: `UPDATE sadhana_live_participants_sql SET name = ?, last_seen = ? WHERE session_id = ? AND program_slug = ?`,
        args: [cleanName, now, sessionId, params.slug]
      });
    } else {
      await bunnyExecute({
        sql: `INSERT INTO sadhana_live_participants_sql (id, session_id, program_slug, name, joined_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id1, sessionId, params.slug, cleanName, now, now]
      });
    }

    const existingJoin = await bunnyExecute({
      sql: `SELECT id FROM sadhana_join_history_sql WHERE session_id = ? AND program_slug = ?`,
      args: [sessionId, params.slug]
    });

    if (existingJoin.rows && existingJoin.rows.length > 0) {
      await bunnyExecute({
        sql: `UPDATE sadhana_join_history_sql SET name = ?, left_at = ? WHERE session_id = ? AND program_slug = ?`,
        args: [cleanName, now, sessionId, params.slug]
      });
    } else {
      const id2 = require('crypto').randomUUID();
      await bunnyExecute({
        sql: `INSERT INTO sadhana_join_history_sql (id, session_id, program_slug, name, joined_at, left_at) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id2, sessionId, params.slug, cleanName, now, now]
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/[slug]/join');
  }
}
