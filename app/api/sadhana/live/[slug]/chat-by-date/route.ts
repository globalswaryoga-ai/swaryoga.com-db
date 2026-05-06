/**
 * GET /api/sadhana/live/[slug]/chat-by-date?date=2026-05-05
 *
 * Fetch all chat messages for a specific date
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import mongoose from 'mongoose';

async function getDb() {
  await connectDB();
  return mongoose.connection.useDb('swaryoga_admin_crm');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date'); // YYYY-MM-DD format

    if (!dateStr) {
      return NextResponse.json({ error: 'date parameter required' }, { status: 400 });
    }

    const db = await getDb();
    const chatCol = db.collection('sadhana_live_chat');

    // Parse the requested date
    const [year, month, day] = dateStr.split('-').map(Number);

    // Create date range in UTC (treating input as UTC for consistency)
    const dateStart = new Date(year, month - 1, day, 0, 0, 0);
    const dateEnd = new Date(year, month - 1, day, 23, 59, 59);

    const startMs = dateStart.getTime();
    const endMs = dateEnd.getTime();

    const messages = await chatCol
      .find({
        programSlug: params.slug,
        createdAt: {
          $gte: new Date(startMs),
          $lte: new Date(endMs),
        },
      })
      .sort({ createdAt: 1 })
      .lean()
      .toArray();

    return NextResponse.json({
      success: true,
      date: dateStr,
      programSlug: params.slug,
      totalMessages: messages.length,
      messages: messages.map(msg => ({
        id: msg._id?.toString() || '',
        name: msg.name || 'Unknown',
        message: msg.message || '',
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    return handleCrmError(error, 'GET sadhana/live/[slug]/chat-by-date');
  }
}
