import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import {
  initMasterIdentityDatabase,
  MOHAN_SIR_MASTER_IDENTITY_ID,
  MASTER_GENERATION_MODES,
  validateVideoIdentityConsistency,
} from '@/lib/avatarStudio/masterIdentityEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await initMasterIdentityDatabase();

    const res = await bunnyExecute({
      sql: `SELECT * FROM mohan_master_identity_sql WHERE identity_id = ?`,
      args: [MOHAN_SIR_MASTER_IDENTITY_ID],
    });

    if (!res.rows || res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Master Identity not found' }, { status: 404 });
    }

    const row = res.rows[0] as any;

    return NextResponse.json({
      success: true,
      data: {
        identity_id: row.identity_id,
        name: row.name,
        version: row.version,
        status: row.status,
        identity_quality_score: row.identity_quality_score,
        dataset_manifest: JSON.parse(row.dataset_manifest_json || '{}'),
        landmark_embedding: JSON.parse(row.landmark_embedding_json || '{}'),
        approved_reference_images: JSON.parse(row.approved_reference_images_json || '[]'),
        training_history: JSON.parse(row.training_history_json || '[]'),
        model_compatibility: JSON.parse(row.model_compatibility_json || '{}'),
        validation_results: JSON.parse(row.validation_results_json || '{}'),
        generation_modes: MASTER_GENERATION_MODES,
        updated_at: row.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Error fetching master identity:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, video_url } = body;

    if (action === 'validate_consistency') {
      if (!video_url) {
        return NextResponse.json({ success: false, error: 'video_url is required' }, { status: 400 });
      }

      const result = await validateVideoIdentityConsistency(video_url);
      return NextResponse.json({ success: true, validation: result });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}

