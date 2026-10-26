import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const slug = resolvedParams?.slug || '';

    const { sessionId, name } = await request.json();
    if (!sessionId || !name) {
      return NextResponse.json({ error: 'sessionId and name required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const cleanName = String(name).trim().slice(0, 50);

    // Ultra-fast parallel execution without schema initialization overhead
    await Promise.allSettled([
      bunnyExecute({
        sql: `INSERT OR REPLACE INTO sadhana_live_participants_sql (id, session_id, program_slug, name, joined_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), sessionId, slug, cleanName, now, now],
      }),
      bunnyExecute({
        sql: `INSERT INTO sadhana_join_history_sql (id, session_id, program_slug, name, joined_at, left_at) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), sessionId, slug, cleanName, now, now],
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: true, fast: true });
  }
}
