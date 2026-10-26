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

    const now = new Date().toISOString();
    const cleanName = String(name).slice(0, 50);
    const slug = scheduleId || 'default';

    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO sadhana_live_participants_sql (id, program_slug, session_id, name, last_seen, joined_at) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), slug, sessionId, cleanName, now, now],
    });

    return NextResponse.json({ success: true, sessionId }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: true, sessionId: 'fallback' }, { status: 200 });
  }
}
