import { NextRequest, NextResponse } from 'next/server';
import {
  listVideoAvatars,
  saveVideoAvatar,
  deleteVideoAvatar,
  listVoiceAvatars,
  saveVoiceAvatar,
  deleteVoiceAvatar,
  listFinalAvatars,
  saveFinalAvatar,
  deleteFinalAvatar,
  listProductionProjects,
  saveProductionProject,
} from '@/lib/bunnyAvatarStudioRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    if (type === 'video_avatars') {
      const items = await listVideoAvatars();
      return NextResponse.json({ success: true, items });
    } else if (type === 'voice_avatars') {
      const items = await listVoiceAvatars();
      return NextResponse.json({ success: true, items });
    } else if (type === 'final_avatars') {
      const items = await listFinalAvatars();
      return NextResponse.json({ success: true, items });
    } else if (type === 'projects') {
      const items = await listProductionProjects();
      return NextResponse.json({ success: true, items });
    }

    // Default: return all in one payload for quick studio hydration
    const [videoAvatars, voiceAvatars, finalAvatars, projects] = await Promise.all([
      listVideoAvatars(),
      listVoiceAvatars(),
      listFinalAvatars(),
      listProductionProjects(),
    ]);

    return NextResponse.json({
      success: true,
      videoAvatars,
      voiceAvatars,
      finalAvatars,
      projects,
    });
  } catch (error: any) {
    console.error('Studio Hub GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch studio items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, payload } = body;

    if (action === 'save_video_avatar') {
      const res = await saveVideoAvatar(payload);
      return NextResponse.json({ success: true, item: res });
    } else if (action === 'delete_video_avatar') {
      await deleteVideoAvatar(payload.id);
      return NextResponse.json({ success: true });
    } else if (action === 'save_voice_avatar') {
      const res = await saveVoiceAvatar(payload);
      return NextResponse.json({ success: true, item: res });
    } else if (action === 'delete_voice_avatar') {
      await deleteVoiceAvatar(payload.id);
      return NextResponse.json({ success: true });
    } else if (action === 'save_final_avatar') {
      const res = await saveFinalAvatar(payload);
      return NextResponse.json({ success: true, item: res });
    } else if (action === 'delete_final_avatar') {
      await deleteFinalAvatar(payload.id);
      return NextResponse.json({ success: true });
    } else if (action === 'save_project') {
      const res = await saveProductionProject(payload);
      return NextResponse.json({ success: true, item: res });
    }

    return NextResponse.json({ error: 'Unknown studio action' }, { status: 400 });
  } catch (error: any) {
    console.error('Studio Hub POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process studio action' }, { status: 500 });
  }
}
