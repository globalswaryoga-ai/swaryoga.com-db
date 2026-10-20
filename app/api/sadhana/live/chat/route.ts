import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { handleCrmError } from '@/lib/crm-handlers';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initSadhanaBunnySchema } from '@/lib/bunnySadhanaRepository';

export async function POST(request: NextRequest) {
  try {
    const { name, message, scheduleId } = await request.json();

    if (!name || !message) {
      return NextResponse.json({ error: 'name and message required' }, { status: 400 });
    }

    const cleanMsg = String(message).slice(0, 300).trim();
    if (!cleanMsg) {
      return NextResponse.json({ error: 'empty message' }, { status: 400 });
    }

    await initSadhanaBunnySchema();
    const now = new Date().toISOString();
    const slug = scheduleId || 'default';
    const cleanSender = String(name).slice(0, 50);

    await bunnyExecute({
      sql: 'INSERT INTO sadhana_live_chat_sql (id, program_slug, session_id, sender, message, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [crypto.randomUUID(), slug, 'chat', cleanSender, cleanMsg, now]
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleCrmError(error, 'POST sadhana/live/chat');
  }
}
