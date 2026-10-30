import { NextResponse } from 'next/server';
import {
  deleteTrainingVideoSlot,
  getTrainingVideosForProject,
  saveTrainingVideoSlot,
} from '@/lib/mohanAiClone/trainingProjectsRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'mohan_master_clone_proj_v1';
    const videos = await getTrainingVideosForProject(projectId);
    return NextResponse.json({ success: true, videos });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      training_project_id = 'mohan_master_clone_proj_v1',
      slot_number,
      original_filename,
      storage_object_key,
      file_url,
      duration_seconds = 120,
      resolution_width = 1280,
      resolution_height = 720,
      frame_rate = 30,
      audio_sample_rate = 44100,
      audio_snr_db = 20,
      face_visibility_score = 0.9,
      body_visibility_score = 0.8,
      lighting_score = 0.85,
      analysis_status = 'approved',
      analysis_metrics_json,
    } = body;

    if (!slot_number || slot_number < 1 || slot_number > 20) {
      return NextResponse.json(
        { success: false, error: 'slot_number must be an integer between 1 and 20' },
        { status: 400 }
      );
    }

    if (!file_url || !original_filename) {
      return NextResponse.json(
        { success: false, error: 'file_url and original_filename are required' },
        { status: 400 }
      );
    }

    const saved = await saveTrainingVideoSlot({
      training_project_id,
      slot_number: Number(slot_number),
      original_filename,
      storage_object_key: storage_object_key || `mohan-avatar/training/slot_${slot_number}.mp4`,
      file_url,
      duration_seconds: Number(duration_seconds),
      resolution_width: Number(resolution_width),
      resolution_height: Number(resolution_height),
      frame_rate: Number(frame_rate),
      audio_sample_rate: Number(audio_sample_rate),
      audio_snr_db: Number(audio_snr_db),
      face_visibility_score: Number(face_visibility_score),
      body_visibility_score: Number(body_visibility_score),
      lighting_score: Number(lighting_score),
      analysis_status,
      analysis_metrics_json: typeof analysis_metrics_json === 'string' ? analysis_metrics_json : JSON.stringify(analysis_metrics_json || {}),
    });

    return NextResponse.json({ success: true, slot: saved });
  } catch (error: any) {
    console.error('Error saving training video slot:', error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'mohan_master_clone_proj_v1';
    const slotNumber = searchParams.get('slotNumber');

    if (!slotNumber) {
      return NextResponse.json({ success: false, error: 'slotNumber is required' }, { status: 400 });
    }

    await deleteTrainingVideoSlot(projectId, Number(slotNumber));
    return NextResponse.json({ success: true, message: `Slot ${slotNumber} deleted successfully` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

