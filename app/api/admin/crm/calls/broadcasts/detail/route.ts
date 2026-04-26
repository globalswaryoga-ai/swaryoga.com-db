/**
 * Broadcast Detail API — Drill-down for individual calls in a batch
 * GET /api/admin/crm/calls/broadcasts/detail?batchName=xxx
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-error';
import { getAICallLog } from '@/lib/schemas/enterpriseSchemas';
import { tenantFilter, isSuperAdmin, getViewerUserId } from '@/lib/crm-handlers';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);
    if (!decoded?.isAdmin && !decoded?.userId) return apiError('UNAUTHORIZED');
    const tf = tenantFilter(decoded, 'initiatedBy');

    const batchName = request.nextUrl.searchParams.get('batchName');
    if (!batchName) return apiError('VALIDATION_ERROR', 'batchName is required');

    await connectDB();
    const AICallLog = getAICallLog();

    const calls = await AICallLog.find({ batchName, ...tf })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean() as any[];

    // Summary
    const total = calls.length;
    const completed = calls.filter((c: any) => c.status === 'completed').length;
    const failed = calls.filter((c: any) => ['failed', 'no_answer', 'busy', 'canceled'].includes(c.status)).length;
    const active = calls.filter((c: any) => ['queued', 'ringing', 'in_progress'].includes(c.status)).length;
    const totalDuration = calls.reduce((s: number, c: any) => s + (c.duration || 0), 0);
    const costPerMin = 0.07;
    const totalCost = Math.round((totalDuration / 60) * costPerMin * 100) / 100;

    // Format each call for display
    const formattedCalls = calls.map((c: any) => ({
      _id: c._id,
      leadId: c.leadId,
      phoneNumber: c.phoneNumber,
      status: c.status,
      duration: c.duration || 0,
      sentiment: c.sentiment || '',
      summary: c.summary || '',
      transcript: c.transcript || '',
      recordingUrl: c.recordingUrl || '',
      callEndedReason: c.callEndedReason || '',
      purpose: c.purpose,
      language: c.language,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      createdAt: c.createdAt,
      scheduledAt: c.scheduledAt,
      cost: Math.round((((c.duration || 0) / 60) * costPerMin) * 100) / 100,
    }));

    return apiSuccess({
      batchName,
      calls: formattedCalls,
      summary: { total, completed, failed, active, totalDuration, totalCost },
    });
  } catch (err: any) {
    console.error('[broadcasts/detail GET]', err);
    return apiError('SERVER_ERROR', err.message);
  }
}
