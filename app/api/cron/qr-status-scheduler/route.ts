import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getQrStatusSchedule } from '@/lib/schemas/enterpriseSchemas';
import { resolveQrTenantBridge, isQrTenantConnected, qrTenantHeaders } from '@/lib/qrTenantBridge';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Posts due WhatsApp statuses. Secured by CRON_SECRET.
 *
 * The browser extension schedules these with chrome.alarms, which only fire
 * while that Chrome window is open — a scheduled post silently never happens
 * if the laptop sleeps. This runs server-side instead, so a schedule fires
 * whether or not anyone is logged in.
 *
 * Tenant isolation: each schedule carries its own userId and is posted only
 * through that tenant's own bridge session.
 */

/** Advances a repeating schedule to its next matching weekday, keeping time-of-day. */
function nextOccurrence(from: Date, repeatDays: number[]): Date {
  const next = new Date(from);
  for (let i = 1; i <= 7; i++) {
    next.setDate(next.getDate() + 1);
    if (repeatDays.includes(next.getDay())) return next;
  }
  // Unreachable while repeatDays is non-empty; a week ahead is a safe fallback.
  next.setDate(next.getDate() + 7);
  return next;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const Schedule = getQrStatusSchedule();

    const due = await Schedule.find({ active: true, scheduledAt: { $lte: new Date() } })
      .sort({ scheduledAt: 1 })
      .limit(50)
      .lean();

    let posted = 0;
    let failed = 0;
    let skipped = 0;

    for (const s of due as any[]) {
      const advance = async (error = '') => {
        const repeats = Array.isArray(s.repeatDays) && s.repeatDays.length > 0;
        await Schedule.updateOne(
          { _id: s._id },
          repeats
            ? {
                $set: {
                  scheduledAt: nextOccurrence(new Date(s.scheduledAt), s.repeatDays),
                  lastRunAt: new Date(),
                  lastError: error,
                },
                $inc: { runCount: 1 },
              }
            : { $set: { active: false, lastRunAt: new Date(), lastError: error }, $inc: { runCount: 1 } }
        );
      };

      try {
        const session = await resolveQrTenantBridge(String(s.userId));
        if (!session || !(await isQrTenantConnected(session))) {
          // Not connected right now. A repeating post rolls to its next slot;
          // a one-off stays due so it goes out once the tenant reconnects,
          // rather than being silently dropped.
          skipped++;
          if (Array.isArray(s.repeatDays) && s.repeatDays.length > 0) {
            await advance('WhatsApp was not connected at the scheduled time');
          } else {
            await Schedule.updateOne(
              { _id: s._id },
              { $set: { lastError: 'WhatsApp not connected — will retry' } }
            );
          }
          continue;
        }

        const body = s.imageUrl
          ? { imageUrl: s.imageUrl, caption: s.text || '', text: s.text || '' }
          : { text: s.text };

        const res = await fetch(`${session.url}/post-status`, {
          method: 'POST',
          headers: qrTenantHeaders(session),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(45000),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) {
          throw new Error(data?.error || `post-status failed (HTTP ${res.status})`);
        }

        posted++;
        await advance('');
      } catch (err: any) {
        failed++;
        console.error(`[QR Status Cron] ${s.userId}:`, err?.message);
        await advance(err?.message || 'Post failed');
      }
    }

    return NextResponse.json({ success: true, due: due.length, posted, failed, skipped });
  } catch (error: any) {
    console.error('[QR Status Cron] Error:', error?.message);
    return NextResponse.json({ error: error?.message || 'Status scheduler failed' }, { status: 500 });
  }
}
