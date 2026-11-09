import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromRequest, verifyToken } from '@/lib/auth';
import { InhouseAudioService } from '@/lib/avatarEngine/inhouseAudioService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/avatar/inhouse/audio
 * Returns available preview TTS voices. These are not trained voice clones.
 */
export async function GET() {
  try {
    const catalog = InhouseAudioService.getVoiceCatalog();
    return NextResponse.json({
      success: true,
      voices: catalog,
      message: 'Preview TTS voice catalog loaded.',
    });
  } catch (error: any) {
    console.error('[API inhouse-audio GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get voice catalog' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/avatar/inhouse/audio
 * Synthesizes preview speech, stores the MP3 on Bunny CDN, and returns approximate
 * text-driven viseme frames for the browser preview.
 */
export async function POST(request: NextRequest) {
  const decoded = verifyToken(extractTokenFromRequest(request));
  if (!decoded?.isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    const { script, voiceId, language, speed, pitchHz } = body;

    if (typeof script !== 'string' || !script.trim()) {
      return NextResponse.json(
        { success: false, error: 'Script text is required for audio synthesis.' },
        { status: 400 }
      );
    }

    const result = await InhouseAudioService.synthesizeSpeech({
      script: script.trim(),
      voiceId,
      language: language || 'hi',
      speed: speed === undefined ? 1 : Number(speed),
      pitchHz: pitchHz === undefined ? 0 : Number(pitchHz),
    });

    return NextResponse.json({
      success: true,
      audioUrl: result.audioUrl,
      voiceId: result.voiceId,
      language: result.language,
      durationSeconds: result.durationSeconds,
      wordCount: result.wordCount,
      wordBoundaries: result.wordBoundaries,
      visemeFrames: result.visemeFrames,
      provider: result.provider,
      costExpenseUsd: result.costExpenseUsd,
      message: 'Preview speech synthesized and stored on Bunny CDN.',
    });
  } catch (error: any) {
    console.error('[API inhouse-audio POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to synthesize speech' },
      { status: 500 }
    );
  }
}
