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

    await bunnyExecute({
      sql: `INSERT INTO sadhana_live_participants_sql (session_id, program_slug, name, joined_at, last_seen)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(session_id, program_slug) DO UPDATE SET name = excluded.name, last_seen = excluded.last_seen`,
      args: [sessionId, params.slug, cleanName, now, now]
    });

    await bunnyExecute({
      sql: `INSERT INTO sadhana_join_history_sql (session_id, program_slug, name, joined_at, last_seen)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(session_id, program_slug) DO UPDATE SET name = excluded.name, last_seen = excluded.last_seen`,
      args: [sessionId, params.slug, cleanName, now, now]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/[slug]/join');
  }
}
