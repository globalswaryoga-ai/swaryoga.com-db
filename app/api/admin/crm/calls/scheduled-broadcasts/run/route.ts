/**
 * POST /api/admin/crm/calls/scheduled-broadcasts/run
 * Cron: every minute — fires AI call broadcasts whose scheduledAt has passed
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAICallLog } from '@/lib/schemas/enterpriseSchemas';
import { createBatchCall, checkRetellConfig } from '@/lib/retellAI';

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
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const AICallLog = getAICallLog();

    // Find all queued scheduled calls whose time has come
    const dueLogs = await AICallLog.find({
      status: 'queued',
      scheduledAt: { $lte: new Date() },
    }).lean() as any[];

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

    const configStatus = checkRetellConfig();
    if (!configStatus.configured) {
      return NextResponse.json({
        ok: false,
        error: `Retell AI not configured. Missing: ${configStatus.missing.join(', ')}`,
      }, { status: 500 });
    }

    const results: Array<{ batchName: string; fired: number; error?: string }> = [];

    for (const [batchName, logs] of batches) {
      try {
        // Build tasks for this batch
        const tasks = logs.map((log: any) => {
          const phone = (log.phoneNumber || '').replace(/\D/g, '');
          const fullPhone = phone.startsWith('+') ? phone : `+${phone}`;
          return {
            toNumber: fullPhone,
            leadName: log.leadName || 'there',
            leadId: String(log.leadId),
            dynamicVars: {} as Record<string, string>,
          };
        });

        const lang = logs[0].language?.startsWith('hi') ? 'hi' : 'en';
        const purpose = logs[0].purpose || 'custom';
        const customPrompt = logs[0].customPrompt || '';

        const result = await createBatchCall({
          name: batchName,
          tasks,
          purpose,
          language: lang as 'hi' | 'en',
          customPrompt,
          maxConcurrency: 5,
        });

        const logIds = logs.map((l: any) => l._id);

        if (result.success) {
          await AICallLog.updateMany(
            { _id: { $in: logIds } },
            { $set: { retellBatchId: result.batchId, status: 'ringing', startedAt: new Date() } }
          );
          results.push({ batchName, fired: tasks.length });
        } else {
          await AICallLog.updateMany(
            { _id: { $in: logIds } },
            { $set: { status: 'failed', callEndedReason: result.error || 'Batch call failed' } }
          );
          results.push({ batchName, fired: 0, error: result.error });
        }
      } catch (err: any) {
        results.push({ batchName, fired: 0, error: err.message });
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
