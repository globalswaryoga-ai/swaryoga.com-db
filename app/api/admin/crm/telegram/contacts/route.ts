/**
 * Telegram Contacts API
 * GET — List contacts who have messaged the user's bot
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getTelegramContact } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = getViewerUserId(decoded);
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500);
    const skip = Number(url.searchParams.get('skip') || 0);

    await connectDB();
    const TelegramContact = getTelegramContact();

    const filter: any = { ownerId: userId, isBlocked: { $ne: true } };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { groupTitle: { $regex: search, $options: 'i' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      TelegramContact.find(filter)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TelegramContact.countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, contacts, total });
  } catch (err: any) {
    console.error('[Telegram Contacts GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
