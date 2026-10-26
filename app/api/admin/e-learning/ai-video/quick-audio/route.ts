import { NextRequest, NextResponse } from 'next/server';
import { SwarNeuralVideoService } from '@/lib/aiVideo/swarNeuralVideo';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { script, language = 'hi', voiceId = 'onyx' } = body;

    if (!script || !script.trim()) {
      return NextResponse.json({ error: 'Script text is required' }, { status: 400 });
    }

    const speech = await SwarNeuralVideoService.synthesizeMultilingualSpeech({
      script: script.trim(),
      language,
      voiceId,
    });

    return NextResponse.json({
      success: true,
      audioUrl: speech.audioUrl,
      durationSeconds: speech.durationSeconds,
    });
  } catch (error: any) {
    console.error('[QuickAudio Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to synthesize audio' },
      { status: 500 }
    );
  }
}
