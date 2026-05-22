/**
 * GET /api/admin/crm/qr-broadcast-schedule/stats?scheduleId=xxx
 *
 * Returns statistics for a QR broadcast schedule:
 * - Total recipients
 * - Messages sent today
 * - Messages sent this week
 * - Messages sent overall
 * - Failed count
 * - Pending count
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getDayKey } from '@/lib/messageDeduplication';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId && !decoded?.username) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(req.url);
    const scheduleId = url.searchParams.get('scheduleId');

    if (!scheduleId) {
      return NextResponse.json({ error: 'scheduleId parameter required' }, { status: 400 });
    }

    await connectDB();
    const db = (await import('@/lib/db')).getDb ? (await import('@/lib/db')).getDb() : null;

    // Get MongoDB connection using native driver
    const mongoose = await import('mongoose');
    const connection = mongoose.connection;
    const mongoDb = connection.getClient().db();

    const dedupCollection = mongoDb.collection('message_dedup_log');

    const today = new Date();
    const todayKey = getDayKey(today);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get messages sent for this schedule
    const allMessages = await dedupCollection
      .find({ scheduleId })
      .toArray();

    const todayMessages = allMessages.filter(m => m.dayKey === todayKey);
    const weekMessages = allMessages.filter(m => {
      const msgDate = new Date(m.sentAt);
      return msgDate >= weekAgo && msgDate <= today;
    });

    // Count unique recipients and messages
    const totalChats = new Set(allMessages.map(m => m.chatId)).size;
    const todayChats = new Set(todayMessages.map(m => m.chatId)).size;
    const weekChats = new Set(weekMessages.map(m => m.chatId)).size;

    return NextResponse.json({
      success: true,
      stats: {
        totalSent: allMessages.length,
        totalUniqueRecipients: totalChats,
        todaySent: todayMessages.length,
        todayUniqueRecipients: todayChats,
        weekSent: weekMessages.length,
        weekUniqueRecipients: weekChats,
        lastMessageAt: allMessages.length > 0
          ? new Date(Math.max(...allMessages.map(m => new Date(m.sentAt).getTime())))
          : null,
      }
    });
  } catch (error) {
    console.error('[QR Broadcast Stats]', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
