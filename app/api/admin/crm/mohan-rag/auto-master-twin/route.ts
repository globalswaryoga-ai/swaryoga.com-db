import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { autoSelectAndBindMasterTwin } from '@/lib/mohanRag/autoMasterTwinScorer';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export const dynamic = 'force-dynamic';

function requireAdmin(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const decoded = verifyToken(token);
    return !!decoded && isSuperAdmin(decoded, request);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  try {
    // Check if we have an existing audit
    const res = await bunnyExecute(`SELECT * FROM mohan_master_twin_audit_sql WHERE id = 'audit_master_crown' LIMIT 1`);
    if (res.rows?.length) {
      const row = res.rows[0];
      let ranking = [];
      try { ranking = JSON.parse(String(row.ranking_json || '[]')); } catch {}
      return NextResponse.json({
        success: true,
        crownedVideo: {
          sourceId: row.crowned_source_id,
          title: row.crowned_title,
          videoUrl: row.crowned_video_url,
          overallMasterScore: Number(row.master_score),
          isCrownedMaster: true,
        },
        topRankedVideos: ranking,
        lastEvaluatedAt: row.created_at,
      });
    }

    // Otherwise run fresh evaluation
    const result = await autoSelectAndBindMasterTwin();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Auto Master Twin GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch Master Twin' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }

  try {
    const result = await autoSelectAndBindMasterTwin();
    return NextResponse.json({
      success: true,
      message: `Crown updated: #${1} Master Twin is "${result.crownedVideo.title}" (${result.crownedVideo.overallMasterScore}% Score)`,
      ...result,
    });
  } catch (error: any) {
    console.error('Auto Master Twin POST error:', error);
    return NextResponse.json({ error: error.message || 'Auto-evaluation failed' }, { status: 500 });
  }
}

