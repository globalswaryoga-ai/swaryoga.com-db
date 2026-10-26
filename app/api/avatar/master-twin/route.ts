export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { MasterTwinService } from '@/lib/avatarEngine/masterTwinService';
import { InhouseAudioService } from '@/lib/avatarEngine/inhouseAudioService';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const profile = await MasterTwinService.getMasterProfile();
    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    console.error('[master-twin GET error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch master twin profile' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // 1. Update Beauty & Posture Settings
    if (action === 'update_settings') {
      const updated = await MasterTwinService.updateSettings({
        beautySettings: body.beautySettings,
        defaultVoiceId: body.defaultVoiceId,
        defaultLanguage: body.defaultLanguage,
        defaultPosture: body.defaultPosture,
      });
      return NextResponse.json({ success: true, profile: updated });
    }

    // 2. Feed a new 3-minute recording into Mohan Sir's Master Twin Feature Bank
    if (action === 'feed_recording' || action === 'attach_clip') {
      const { category, subType, title, videoUrl, thumbnailUrl, durationSeconds, description } = body;
      if (!videoUrl || !title) {
        return NextResponse.json(
          { success: false, error: 'Video URL and title are required to train Master Twin' },
          { status: 400 }
        );
      }

      const newClip = await MasterTwinService.attachFeatureClip({
        category: category || 'expression',
        subType: subType || 'smile',
        title: title.trim(),
        videoUrl: videoUrl.trim(),
        thumbnailUrl: thumbnailUrl?.trim() || '',
        durationSeconds: Number(durationSeconds) || 180,
        description: description?.trim(),
      });

      const updatedProfile = await MasterTwinService.getMasterProfile();
      return NextResponse.json({ success: true, clip: newClip, profile: updatedProfile });
    }

    // 3. Synthesize Speech for Text-to-Video in Master Twin's voice
    if (action === 'synthesize_speech') {
      const { text, voiceId, language } = body;
      if (!text?.trim()) {
        return NextResponse.json({ success: false, error: 'Text script is required' }, { status: 400 });
      }

      const audioResult = await InhouseAudioService.synthesizeSpeech({
        text: text.trim(),
        voiceId: voiceId || 'hi-IN-MadhurNeural',
        language: language || 'hi',
      });

      return NextResponse.json({ success: true, audio: audioResult });
    }

    // 4. Create New Avatar with 9-Numerical Code, Multi-Videos & Video Briefs
    if (action === 'create_new_avatar') {
      const { avatarCode, avatarName, mainLanguage, overallBrief, videos } = body;
      const result = await MasterTwinService.createNewAvatar({
        avatarCode,
        avatarName,
        mainLanguage,
        overallBrief,
        videos,
      });

      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[master-twin POST error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process master twin action' },
      { status: 500 }
    );
  }
}
