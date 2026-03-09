/**
 * Telegram Messages API
 * GET — Fetch message history for a specific chat
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getTelegramMessage } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getViewerUserId(decoded);
    const url = new URL(req.url);
    const chatId = url.searchParams.get('chatId');
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
    const before = url.searchParams.get('before'); // ISO date for pagination

    if (!chatId) {
      return NextResponse.json({ error: 'Missing chatId' }, { status: 400 });
    }

    await connectDB();
    const TelegramMsg = getTelegramMessage();

    const filter: any = { ownerId: userId, chatId: Number(chatId) };
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const messages = await TelegramMsg.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ messages: messages.reverse() });
  } catch (err: any) {
    console.error('[Telegram Messages GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
