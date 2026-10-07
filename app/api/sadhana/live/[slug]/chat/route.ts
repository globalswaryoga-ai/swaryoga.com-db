import { NextRequest, NextResponse } from 'next/server';
import { handleCrmError } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initSadhanaBunnySchema } from '@/lib/bunnySadhanaRepository';
import crypto from 'crypto';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { name, message } = await request.json();

    const cleanMsg = String(message || '').slice(0, 300).trim();
    if (!name || !cleanMsg) {
      return NextResponse.json({ error: 'name and message required' }, { status: 400 });
    }

    await initSadhanaBunnySchema();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await bunnyExecute({
      sql: `INSERT INTO sadhana_live_chat_sql (id, program_slug, session_id, sender, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, params.slug, 'default', String(name).slice(0, 50), cleanMsg, now]
    });

    // Keep only last 200 messages per program
    await bunnyExecute({
      sql: `DELETE FROM sadhana_live_chat_sql 
            WHERE program_slug = ? AND id NOT IN (
              SELECT id FROM sadhana_live_chat_sql 
              WHERE program_slug = ? 
              ORDER BY created_at DESC 
              LIMIT 200
            )`,
      args: [params.slug, params.slug]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/[slug]/chat');
  }
}
