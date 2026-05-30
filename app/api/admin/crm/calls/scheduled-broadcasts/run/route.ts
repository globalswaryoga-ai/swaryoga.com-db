/**
 * POST /api/admin/crm/calls/scheduled-broadcasts/run
 * Cron: every minute — fires AI call broadcasts whose scheduledAt has passed
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAICallLog } from '@/lib/schemas/enterpriseSchemas';
import { createBatchCall, checkRetellConfig } from '@/lib/retellAI';
import { makeExotelBatchTTS, isExotelConfigured } from '@/lib/exotelTTS';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function verifyCronSecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  const provided =
    request.headers.get('x-cron-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.includes('vercel-cron')) return true;
  return Boolean(provided && provided === expected);
}

export async function POST(request: NextRequest) {
  // Allow either cron secret OR valid admin JWT
  if (!verifyCronSecret(request)) {
    const jwtToken = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(jwtToken);
    if (!decoded?.isAdmin && !decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    await connectDB();
    const AICallLog = getAICallLog();

    // Find all queued calls whose scheduledAt has passed OR has no scheduledAt (stuck immediate)
    const batchNameParam = new URL(request.url).searchParams.get('batchName');
    const baseFilter: any = {
      status: 'queued',
      $or: [
        { scheduledAt: { $lte: new Date() } },
        { scheduledAt: { $exists: false } },
        { scheduledAt: null },
      ],
    };
    if (batchNameParam) baseFilter.batchName = batchNameParam;

    const dueLogs = await AICallLog.find(baseFilter).lean() as any[];

    if (!dueLogs.length) {
      return NextResponse.json({ ok: true, processed: 0, message: 'No due scheduled broadcasts' });
    }

    // Group by batchName
    const batches = new Map<string, any[]>();
    for (const log of dueLogs) {
      const key = log.batchName || log._id.toString();
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key)!.push(log);
    }

    const results: Array<{ batchName: string; fired: number; provider: string; error?: string }> = [];

    const appBase = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://swaryoga.com');

    for (const [batchName, logs] of batches) {
      try {
        const callMode = logs[0].callMode || 'interactive';
        const callProvider = logs[0].callProvider || (callMode === 'info_only' ? 'exotel' : 'retell');
        const logIds = logs.map((l: any) => l._id);

        // ── Info Only → Exotel TTS ──
        if (callMode === 'info_only' && isExotelConfigured()) {
          const exoTasks = logs.map((log: any) => ({
            toNumber: `+${(log.phoneNumber || '').replace(/\D/g, '')}`,
            leadId: String(log.leadId),
            logId: String(log._id),
          }));

          const exoResult = await makeExotelBatchTTS(exoTasks, appBase);

          await AICallLog.updateMany(
            { _id: { $in: logIds } },
            { $set: { status: 'ringing', startedAt: new Date(), callProvider: 'exotel' } }
          );
          results.push({ batchName, fired: exoResult.queued, provider: 'exotel',
            error: exoResult.failed > 0 ? exoResult.errors[0] : undefined });

        } else {
          // ── Interactive/Q&A → Retell AI ──
          const configStatus = checkRetellConfig();
          if (!configStatus.configured) {
            results.push({ batchName, fired: 0, provider: 'retell',
              error: `Retell not configured: ${configStatus.missing.join(', ')}` });
            continue;
          }

          const tasks = logs.map((log: any) => ({
            toNumber: `+${(log.phoneNumber || '').replace(/\D/g, '')}`,
            leadName: 'there',
            leadId: String(log.leadId),
            dynamicVars: {} as Record<string, string>,
          }));

          const lang = logs[0].language?.startsWith('hi') ? 'hi' : 'en';
          const result = await createBatchCall({
            name: batchName,
            tasks,
            purpose: logs[0].purpose || 'custom',
            language: lang as 'hi' | 'en',
            customPrompt: logs[0].customPrompt || '',
            callMode: callMode as any,
            maxConcurrency: 5,
          });

          if (result.success) {
            await AICallLog.updateMany(
              { _id: { $in: logIds } },
              { $set: { retellBatchId: result.batchId, status: 'ringing', startedAt: new Date() } }
            );
            results.push({ batchName, fired: tasks.length, provider: 'retell' });
          } else {
            await AICallLog.updateMany(
              { _id: { $in: logIds } },
              { $set: { status: 'failed', callEndedReason: result.error || 'Batch call failed' } }
            );
            results.push({ batchName, fired: 0, provider: 'retell', error: result.error });
          }
        }
      } catch (err: any) {
        results.push({ batchName, fired: 0, provider: 'unknown', error: err.message });
      }
    }

    const totalFired = results.reduce((s, r) => s + r.fired, 0);
    console.log(`[scheduled-broadcasts/run] Processed ${batches.size} batches, fired ${totalFired} calls`);

    return NextResponse.json({ ok: true, processed: batches.size, totalFired, results });
  } catch (err: any) {
    console.error('[scheduled-broadcasts/run]', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// Also support GET for Vercel cron (some setups call via GET)
export async function GET(request: NextRequest) {
  return POST(request);
}
