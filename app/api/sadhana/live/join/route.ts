import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { handleCrmError } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initSadhanaBunnySchema } from '@/lib/bunnySadhanaRepository';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, name, scheduleId } = await request.json();

    if (!sessionId || !name) {
      return NextResponse.json({ error: 'sessionId and name required' }, { status: 400 });
    }

    await initSadhanaBunnySchema();
    const now = new Date().toISOString();
    const cleanName = String(name).slice(0, 50);
    const slug = scheduleId || 'default';

    const existing = await bunnyExecute({
      sql: 'SELECT id FROM sadhana_live_participants_sql WHERE session_id = ? LIMIT 1',
      args: [sessionId]
    });

    if (existing.rows.length > 0) {
      await bunnyExecute({
        sql: 'UPDATE sadhana_live_participants_sql SET name = ?, last_seen = ? WHERE session_id = ?',
        args: [cleanName, now, sessionId]
      });
    } else {
      await bunnyExecute({
        sql: 'INSERT INTO sadhana_live_participants_sql (id, program_slug, session_id, name, last_seen, joined_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [crypto.randomUUID(), slug, sessionId, cleanName, now, now]
      });
    }

    return NextResponse.json({ success: true, sessionId }, { status: 200 });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/join');
  }
}
