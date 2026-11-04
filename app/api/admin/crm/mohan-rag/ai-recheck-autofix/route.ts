import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import {
  scanVideoSourcesForAutoFix,
  autoFixSingleVideoSource,
  autoFixBatchVideoSources,
} from '@/lib/mohanRag/aiRecheckAutoFixWorker';

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
    const scan = await scanVideoSourcesForAutoFix(moduleId);

    return NextResponse.json({
      success: true,
      scan,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to scan video sources';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || 'batch');

    if (action === 'fix_single' && body?.sourceId) {
      const result = await autoFixSingleVideoSource(String(body.sourceId));
      return NextResponse.json({
        success: true,
        action: 'fix_single',
        result,
      });
    }

    // Default: batch auto-fix
    const limit = Math.min(20, Math.max(1, Number(body?.limit || 5)));
    const moduleId = body?.moduleId ? String(body.moduleId) : undefined;

    const result = await autoFixBatchVideoSources({
      moduleId,
      limit,
    });

    return NextResponse.json({
      success: true,
      action: 'batch',
      result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Auto-fix worker failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

