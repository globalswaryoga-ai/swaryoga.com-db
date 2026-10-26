import { NextRequest, NextResponse } from 'next/server';
import { InhouseAudioService } from '@/lib/avatarEngine/inhouseAudioService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/avatar/inhouse/audio
 * Returns all available 100% free neural Indian and international voices.
 */
export async function GET(request: NextRequest) {
  try {
    const catalog = InhouseAudioService.getVoiceCatalog();
    return NextResponse.json({
      success: true,
      voices: catalog,
      message: 'Zero-expense in-house neural voices loaded successfully.',
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
 * Synthesizes speech with 100% zero external cost, uploads MP3 to Bunny CDN,
 * and calculates exact phoneme/viseme timing frames for real-time lip-sync.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { script, voiceId, language, speed, pitchHz } = body;

    if (!script || !script.trim()) {
      return NextResponse.json(
        { success: false, error: 'Script text is required for audio synthesis.' },
        { status: 400 }
      );
    }

    const result = await InhouseAudioService.synthesizeSpeech({
      script: script.trim(),
      voiceId,
      language: language || 'hi',
      speed: speed ? Number(speed) : 1.0,
      pitchHz: pitchHz ? Number(pitchHz) : 0,
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
      message: 'Zero-expense neural audio synthesized and uploaded to Bunny CDN successfully!',
    });
  } catch (error: any) {
    console.error('[API inhouse-audio POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to synthesize speech' },
      { status: 500 }
    );
  }
}
