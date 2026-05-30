/**
 * POST/GET /api/admin/crm/calls/exotel/status?logId=xxx
 * Exotel calls this when a call ends — updates AICallLog status.
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAICallLog } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

async function handle(request: NextRequest) {
  const logId = request.nextUrl.searchParams.get('logId');
  if (!logId) return new NextResponse('ok');

  try {
    const body = request.method === 'POST'
      ? Object.fromEntries(new URLSearchParams(await request.text()))
      : Object.fromEntries(request.nextUrl.searchParams);

    const exoStatus = body.Status || body.status || '';
    const duration = parseInt(body.Duration || body.duration || '0', 10);
    const callSid = body.CallSid || body.sid || '';

    // Map Exotel status to our status
    const statusMap: Record<string, string> = {
      completed:   'completed',
      no_answer:   'no_answer',
      busy:        'busy',
      failed:      'failed',
      canceled:    'canceled',
      in_progress: 'in_progress',
    };
    const status = statusMap[exoStatus.toLowerCase()] || 'completed';

    await connectDB();
    const AICallLog = getAICallLog();
    await AICallLog.findByIdAndUpdate(logId, {
      $set: {
        status,
        duration,
        callEndedReason: exoStatus,
        retellBatchId: callSid, // reuse field to store Exotel call SID
        endedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[exotel/status]', err);
  }

  return new NextResponse('ok');
}

export const GET = handle;
export const POST = handle;
