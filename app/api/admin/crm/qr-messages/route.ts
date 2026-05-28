import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getQrWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

function getUserId(decoded: any): string {
  return decoded?.userId || decoded?.username || decoded?.id || '';
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId && !decoded?.username) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const userId = getUserId(decoded);
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    await connectDB();
    const QrMsg = getQrWhatsAppMessage();

    const url = new URL(req.url);
    const direction = url.searchParams.get('direction') || 'outbound';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '200'), 500);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build message list filter
    const filter: any = { userId };
    if (direction !== 'all') filter.direction = direction;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = Math.floor(new Date(startDate).getTime() / 1000);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        filter.timestamp.$lt = Math.floor(end.getTime() / 1000);
      }
    }

    // Baileys numeric status: 0=pending, 1=sent, 2=delivered, 3=read, -1=failed
    if (status === 'sent')    filter.status = { $gte: 1 };
    else if (status === 'pending') filter.status = 0;
    else if (status === 'failed')  filter.status = -1;

    const [messages, total] = await Promise.all([
      QrMsg.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      QrMsg.countDocuments(filter),
    ]);

    // ── Period boundaries (Unix seconds for qr_whatsapp_messages, Date for qr_message_queue) ──
    const now = new Date();
    const todayStart  = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);
    const weekStart   = Math.floor(Date.now() / 1000) - 7 * 24 * 3600;
    const monthStart  = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);
    const yearStart   = Math.floor(new Date(now.getFullYear(), 0, 1).getTime() / 1000);

    const todayDate  = new Date(todayStart  * 1000);
    const weekDate   = new Date(weekStart   * 1000);
    const monthDate  = new Date(monthStart  * 1000);
    const yearDate   = new Date(yearStart   * 1000);

    const outGroup = {
      _id: null,
      sent:     { $sum: { $cond: [{ $gte: ['$status', 1] },  1, 0] } }, // 1=sent, 2=delivered, 3=read
      pending:  { $sum: { $cond: [{ $eq:  ['$status', 0] },  1, 0] } }, // 0=queued/sending
      failed:   { $sum: { $cond: [{ $eq:  ['$status', -1] }, 1, 0] } }, // -1=error
    };

    // Access qr_message_queue (time-blocked messages) from CRM DB
    const crmDb = mongoose.connection.getClient().db(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const queueCol = crmDb.collection('qr_message_queue');

    const outF = { userId, direction: 'outbound' };
    const inF  = { userId, direction: 'inbound' };

    const [
      todayOut, weekOut, monthOut, yearOut,
      todayIn,  weekIn,  monthIn,  yearIn,
      todayBlocked, weekBlocked, monthBlocked, yearBlocked,
    ] = await Promise.all([
      // Outbound stats
      QrMsg.aggregate([{ $match: { ...outF, timestamp: { $gte: todayStart } } }, { $group: outGroup }]),
      QrMsg.aggregate([{ $match: { ...outF, timestamp: { $gte: weekStart  } } }, { $group: outGroup }]),
      QrMsg.aggregate([{ $match: { ...outF, timestamp: { $gte: monthStart } } }, { $group: outGroup }]),
      QrMsg.aggregate([{ $match: { ...outF, timestamp: { $gte: yearStart  } } }, { $group: outGroup }]),
      // Inbound (received) counts
      QrMsg.countDocuments({ ...inF, timestamp: { $gte: todayStart } }),
      QrMsg.countDocuments({ ...inF, timestamp: { $gte: weekStart  } }),
      QrMsg.countDocuments({ ...inF, timestamp: { $gte: monthStart } }),
      QrMsg.countDocuments({ ...inF, timestamp: { $gte: yearStart  } }),
      // Blocked by time guard (in qr_message_queue, status = 'pending')
      queueCol.countDocuments({ userId, status: 'pending', createdAt: { $gte: todayDate  } }),
      queueCol.countDocuments({ userId, status: 'pending', createdAt: { $gte: weekDate   } }),
      queueCol.countDocuments({ userId, status: 'pending', createdAt: { $gte: monthDate  } }),
      queueCol.countDocuments({ userId, status: 'pending', createdAt: { $gte: yearDate   } }),
    ]);

    const extract = (outArr: any[], received: number, blocked: number) => ({
      sent:     (outArr[0]?.sent    || 0) as number,
      pending:  (outArr[0]?.pending || 0) as number,
      failed:   (outArr[0]?.failed  || 0) as number,
      received,
      blocked,
    });

    return NextResponse.json({
      success: true,
      messages,
      total,
      stats: {
        today: extract(todayOut, todayIn, todayBlocked),
        week:  extract(weekOut,  weekIn,  weekBlocked),
        month: extract(monthOut, monthIn, monthBlocked),
        year:  extract(yearOut,  yearIn,  yearBlocked),
      },
    });
  } catch (err: any) {
    console.error('[QR Messages API]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
