import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  getPipelineHealthDashboard,
  runFullFourWorkerPipeline,
  runWorker1_ConvertSource,
  runWorker2_CheckConversion,
  runWorker3_PropagateData,
  runWorker4_VerifyDistribution,
} from '@/lib/mohanRag/fourWorkerPipeline';
import { getKnowledgeSource } from '@/lib/mohanRag/knowledgeRepository';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function requireAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const decoded = verifyToken(token);
  return decoded && isSuperAdmin(decoded, request) ? decoded : null;
}

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

    const moduleId = request.nextUrl.searchParams.get('module') || undefined;
    const dashboard = await getPipelineHealthDashboard(moduleId);

    return NextResponse.json({
      success: true,
      dashboard,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to get 4-worker pipeline health dashboard';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || 'run_single');
    const sourceId = String(body?.sourceId || '').trim();

    if (action === 'run_single' && sourceId) {
      const report = await runFullFourWorkerPipeline(sourceId);
      return NextResponse.json({
        success: true,
        action: 'run_single',
        report,
      });
    }

    if (action === 'run_worker' && sourceId) {
      const workerNum = Number(body?.workerNumber || 1);
      if (workerNum === 1) {
        const res = await runWorker1_ConvertSource(sourceId);
        return NextResponse.json({ success: true, worker: 1, result: res });
      } else if (workerNum === 2) {
        const source = await getKnowledgeSource(sourceId);
        if (!source) throw new Error('Source not found');
        const res = runWorker2_CheckConversion(source);
        return NextResponse.json({ success: true, worker: 2, result: res });
      } else if (workerNum === 3) {
        const res = await runWorker3_PropagateData(sourceId);
        return NextResponse.json({ success: true, worker: 3, result: res });
      } else if (workerNum === 4) {
        const res = await runWorker4_VerifyDistribution(sourceId);
        return NextResponse.json({ success: true, worker: 4, result: res });
      }
    }

    if (action === 'run_batch') {
      const moduleId = body?.moduleId ? String(body.moduleId) : undefined;
      const limit = Math.min(10, Math.max(1, Number(body?.limit || 3)));
      const dashboard = await getPipelineHealthDashboard(moduleId);

      const toProcess = dashboard.reports
        .filter(r => r.worker2_verification.isDummyOrPdf)
        .slice(0, limit);

      const batchResults: any[] = [];
      for (const item of toProcess) {
        try {
          const rep = await runFullFourWorkerPipeline(item.sourceId);
          batchResults.push({ sourceId: item.sourceId, title: item.title, success: true, report: rep });
        } catch (err: any) {
          batchResults.push({ sourceId: item.sourceId, title: item.title, success: false, error: err.message });
        }
      }

      return NextResponse.json({
        success: true,
        action: 'run_batch',
        processed: batchResults.length,
        results: batchResults,
      });
    }

    return NextResponse.json({ error: 'Invalid action or missing sourceId' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '4-Worker pipeline operation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

